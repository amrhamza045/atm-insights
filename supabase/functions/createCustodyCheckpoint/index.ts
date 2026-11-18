import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { CUSTODY_STAGES, TRIP_STAGE_MAP, TRIP_TS_FIELD, STAGE_CONFIRMER, CUSTODY_STAGE_LABELS } from '../_shared/custodyStages.js';
import { sendCustodyNotification } from '../_shared/custodyNotifications.js';
import { checkPermission } from '../_shared/requirePermission.js';
import { audit } from '../_shared/auditLog.js';

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await req.json();
    const { trip_id, stage, item_details = [], discrepancy_notes = "", photo_url = "" } = payload;

    if (!trip_id) return Response.json({ error: "trip_id is required" }, { status: 400 });
    if (!CUSTODY_STAGES.includes(stage)) {
      return Response.json({ error: `Invalid stage. Must be one of: ${CUSTODY_STAGES.join(", ")}` }, { status: 400 });
    }
    if (!Array.isArray(item_details)) {
      return Response.json({ error: "item_details must be an array" }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    const trip = await svc.entities.CateringTrip.get(trip_id).catch(() => null);
    if (!trip) return Response.json({ error: "Trip not found" }, { status: 404 });
    if (trip.stage === "cancelled") {
      return Response.json({ error: "This trip is cancelled — custody checkpoints cannot be confirmed on it" }, { status: 400 });
    }

    const existing = await svc.entities.CateringCustodyCheckpoint.filter({ trip_id });

    // 1. Immutability: one record per trip + stage, never overwritten
    if (existing.some((c) => c.stage === stage)) {
      return Response.json({
        error: `The '${stage}' checkpoint is already confirmed for this trip. Custody checkpoints are immutable.`,
      }, { status: 409 });
    }

    // 2. Sequential enforcement: the immediately preceding stage must exist
    const idx = CUSTODY_STAGES.indexOf(stage);
    let prev = null;
    if (idx > 0) {
      prev = existing.find((c) => c.stage === CUSTODY_STAGES[idx - 1]) || null;
      if (!prev) {
        return Response.json({
          error: `Cannot confirm '${stage}' — '${CUSTODY_STAGES[idx - 1]}' has not been confirmed yet. Stages cannot be skipped.`,
        }, { status: 400 });
      }
    }

    // Identify the confirming person (Employee record if one exists for this user)
    const employees = await svc.entities.Employee.filter({ email: user.email });
    const emp = employees[0] || null;
    const reporterName = (emp && (emp.full_name || emp.name)) || user.full_name || user.email;

    // 3. Responsibility: an explicit per-stage email assignment wins; otherwise
    //    driver stages default to the trip driver, and the return handoff is open
    //    to any authorized staff member. Admins may always override.
    const assignment = (trip.custody_assignments || []).find(
      (a: any) => a.stage === stage && a.assigned_email
    );
    const canOverride = (await checkPermission(base44, user, "catering_approve")).allowed;
    if (!canOverride) {
      if (assignment) {
        if (assignment.assigned_email.toLowerCase() !== user.email.toLowerCase()) {
          return Response.json({
            error: `'${CUSTODY_STAGE_LABELS[stage]}' must be confirmed by ${assignment.assigned_name || assignment.assigned_email}.`,
          }, { status: 403 });
        }
      } else if (STAGE_CONFIRMER[stage] === "driver" && trip.driver_employee_id) {
        if (!emp || emp.id !== trip.driver_employee_id) {
          return Response.json({
            error: `'${CUSTODY_STAGE_LABELS[stage]}' must be confirmed by the trip driver (${trip.driver_name || "assigned driver"}).`,
          }, { status: 403 });
        }
      }
    }

    // 4. Status is derived from the counts — no separate shortage flow
    const shortItems = item_details.filter((i) => Number(i.actual_quantity) < Number(i.expected_quantity));
    const status = shortItems.length > 0 ? "shortage" : "confirmed_complete";

    const now = new Date().toISOString();

    const checkpoint = await svc.entities.CateringCustodyCheckpoint.create({
      trip_id,
      trip_label: trip.trip_label || "",
      event_id: trip.event_id || "",
      event_name: trip.event_name || "",
      event_date: trip.event_date || "",
      branch_id: trip.branch_id || "",
      branch_name: trip.branch_name || "",
      stage,
      status,
      reported_by_employee_id: emp?.id || "",
      reported_by_name: reporterName,
      reported_by_email: user.email,
      responsible_employee_id: prev?.reported_by_employee_id || "",
      responsible_name: prev?.reported_by_name || "",
      responsible_email: prev?.reported_by_email || "",
      confirmed_at: now,
      item_details,
      discrepancy_notes,
      photo_url,
    });

    // 5. Trip stage is derived from custody checkpoints — sync it here
    const tripUpdate: Record<string, unknown> = {
      custody_confirmed_stages: [...new Set([...existing.map((c) => c.stage), stage])],
    };
    const tripStage = TRIP_STAGE_MAP[stage];
    if (tripStage) {
      tripUpdate.stage = tripStage;
      const tsField = TRIP_TS_FIELD[stage];
      if (tsField && !trip[tsField]) tripUpdate[tsField] = now;
    }
    await svc.entities.CateringTrip.update(trip_id, tripUpdate);

    // 6. Shortage: log a feedback record naming both sides of the handover.
    let feedback_id = "";
    if (status === "shortage") {
      const detail = shortItems
        .map((i) => `${i.item_name}: expected ${i.expected_quantity}, got ${i.actual_quantity}`)
        .join("; ");
      const fb = await svc.entities.CateringStaffFeedback.create({
        branch_id: trip.branch_id || "",
        branch_name: trip.branch_name || "",
        event_id: trip.event_id || "unknown",
        event_name: trip.event_name || "",
        event_date: trip.event_date || "",
        employee_id: prev?.reported_by_employee_id || emp?.id || "unassigned",
        employee_name: prev?.reported_by_name || reporterName,
        role_name: "Custody chain",
        rating: 0,
        comment: `[Custody shortage] Trip "${trip.trip_label || trip_id}", ${CUSTODY_STAGE_LABELS[stage]}. Handed over by: ${prev?.reported_by_name || "warehouse (first checkpoint)"}; checked by: ${reporterName}. ${detail}.${discrepancy_notes ? ` Notes: ${discrepancy_notes}` : ""}`,
        source: "custody_shortage",
        custody_checkpoint_id: checkpoint.id,
        review_status: "not_applicable",
      });
      feedback_id = fb.id;
      await svc.entities.CateringCustodyCheckpoint.update(checkpoint.id, { feedback_id });
    }

    const nextStage = CUSTODY_STAGES[idx + 1];
    const nextAssignment = nextStage
      ? (trip.custody_assignments || []).find((a: any) => a.stage === nextStage && a.assigned_email)
      : null;
    let next_notified = false;
    if (nextAssignment) {
      const nextLabel = CUSTODY_STAGE_LABELS[nextStage] || nextStage;
      const title = `Equipment ready: ${nextLabel}`;
      const message = `${reporterName} confirmed "${CUSTODY_STAGE_LABELS[stage]}" for trip "${trip.trip_label || "Trip"}". The equipment is now ready for your "${nextLabel}" handover. Open "My Custody" to count and confirm it.`;
      const settingsRows = await svc.entities.CateringSettings.list();
      const emailsEnabled = settingsRows[0] ? settingsRows[0].custody_emails_enabled !== false : true;
      next_notified = await sendCustodyNotification({ svc, trip, assignment: nextAssignment, title, message, emailsEnabled });
    }

    await audit(base44, user, 'approve', 'CustodyCheckpoint',
      `Custody checkpoint recorded (${status})`, { entityId: checkpoint.id, entityName: trip.event_name || null });
    return Response.json({ success: true, checkpoint_id: checkpoint.id, status, feedback_id, trip_stage: tripStage || trip.stage, next_notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
