import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { CUSTODY_STAGES, CUSTODY_STAGE_LABELS } from '../../shared/custodyStages.js';
import { usersWithPermission } from '../../shared/permissionRecipients.js';
import { loadEmailConfig, sendAndLog } from '../../shared/emailDelivery.js';

const CUSTODY_KEY = 'custody_emails_enabled';
import { getJobNumber } from '../../shared/scheduleGate.js';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';

// Scheduled job: reads CateringTrip + its latest CateringCustodyCheckpoint directly.
// A trip is overdue when its last confirmed checkpoint is older than the threshold
// and the next stage is still unconfirmed — managers are emailed a single digest.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await denyUnlessPermitted(base44, user, 'catering_approve');
    if (denied) return denied;
    const svc = base44.asServiceRole;

    let thresholdHours = await getJobNumber(svc, 'custody_delay_hours');
    try {
      const body = await req.json();
      if (body && Number(body.threshold_hours) > 0) thresholdHours = Number(body.threshold_hours);
    } catch { /* no body — use default */ }

    // Master switch: builder can pause all custody emails from the Chain of custody panel
    const settingsRows = await svc.entities.CateringSettings.list();
    if (settingsRows[0] && settingsRows[0].custody_emails_enabled === false) {
      return Response.json({ success: true, emails_paused: true, message: "Custody emails are paused in settings — no emails sent." });
    }

    const cutoff = Date.now() - thresholdHours * 60 * 60 * 1000;

    const trips = await svc.entities.CateringTrip.list("-created_date", 500);
    const live = trips.filter((t) => !["cancelled", "returned"].includes(t.stage));

    const checkpoints = await svc.entities.CateringCustodyCheckpoint.list("-created_date", 1000);

    const stalled = [];
    for (const trip of live) {
      const tripCps = checkpoints.filter((c) => c.trip_id === trip.id);
      if (tripCps.length === 0) continue; // chain never started — nothing to chase
      if (tripCps.length >= CUSTODY_STAGES.length) continue; // chain complete

      const confirmed = new Set(tripCps.map((c) => c.stage));
      const pendingStage = CUSTODY_STAGES.find((s) => !confirmed.has(s));
      if (!pendingStage) continue;

      const latest = tripCps.reduce((a, b) =>
        new Date(a.confirmed_at || a.created_date) > new Date(b.confirmed_at || b.created_date) ? a : b
      );
      if (new Date(latest.confirmed_at || latest.created_date).getTime() > cutoff) continue;

      const assignment = (trip.custody_assignments || []).find(
        (a) => a.stage === pendingStage && a.assigned_email
      );

      stalled.push({
        trip_id: trip.id,
        trip_label: trip.trip_label || trip.id,
        event_name: trip.event_name || "-",
        branch_name: trip.branch_name || "-",
        driver_name: trip.driver_name || "no driver assigned",
        pending_stage: pendingStage,
        assigned_email: assignment?.assigned_email || "",
        assigned_name: assignment?.assigned_name || "",
        last_stage: latest.stage,
        last_confirmed_at: latest.confirmed_at || latest.created_date,
        last_confirmed_by: latest.reported_by_name || "-",
      });
    }

    if (stalled.length === 0) {
      return Response.json({ success: true, threshold_hours: thresholdHours, stalled_trips: 0, stalled: [] });
    }

    // Nudge each assigned person directly for their overdue stage
    const nudged: string[] = [];
    for (const s of stalled) {
      if (!s.assigned_email) continue;
      const nudge = await sendAndLog(svc, {
        key: CUSTODY_KEY,
        to: [s.assigned_email],
        context: `${s.trip_label} — ${s.event_name}`,
        context_id: s.trip_id || '',
        subject: `Action needed — confirm "${CUSTODY_STAGE_LABELS[s.pending_stage] || s.pending_stage}"`,
        body:
          `You are assigned to confirm the custody handoff "${CUSTODY_STAGE_LABELS[s.pending_stage] || s.pending_stage}" ` +
          `on trip ${s.trip_label} — ${s.event_name} (${s.branch_name}), and it is now more than ${thresholdHours} hour(s) overdue.\n\n` +
          `Please confirm it on Catering → Equipment → Chain of custody.`,
      });
      if (nudge.sent.length) nudged.push(s.assigned_email);
    }

    // Admin › Email can drop the approvers from the digest or add people.
    const config = await loadEmailConfig(svc);
    const admins = config.includesDefault(CUSTODY_KEY) ? await usersWithPermission(svc, "catering_approve") : [];
    const recipients = await config.recipientsFor(CUSTODY_KEY, admins.map((a) => a.email));

    const subject = `Custody chain overdue — ${stalled.length} trip(s)`;
    const body =
      `The following trips have an unconfirmed custody handoff older than ${thresholdHours} hour(s):\n\n` +
      stalled
        .map((s) =>
          `• ${s.trip_label} — ${s.event_name} (${s.branch_name})\n` +
          `  Overdue: ${CUSTODY_STAGE_LABELS[s.pending_stage] || s.pending_stage}\n` +
          `  Last confirmed: ${CUSTODY_STAGE_LABELS[s.last_stage] || s.last_stage} by ${s.last_confirmed_by} at ${s.last_confirmed_at}\n` +
          `  Responsible: ${s.assigned_name || s.assigned_email || `driver — ${s.driver_name}`}`
        )
        .join("\n\n") +
      `\n\nConfirm outstanding handoffs on Catering → Equipment → Chain of custody.`;

    await sendAndLog(svc, { key: CUSTODY_KEY, to: recipients, subject, body, context: `${stalled.length} overdue trip(s)` });

    return Response.json({ success: true, threshold_hours: thresholdHours, stalled_trips: stalled.length, nudged, recipients, stalled });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}