import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { CUSTODY_STAGES, CUSTODY_STAGE_LABELS } from '../_shared/custodyStages.js';
import { sendCustodyNotification } from '../_shared/custodyNotifications.js';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

// Saves the per-stage custody responsibilities on a trip AND tells the people
// involved. Without the notification step an assignee never knows the equipment
// is in their hands, so the chain stalls with the first person.
async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, "catering_edit");
    if (denied) return denied;

    const { trip_id, custody_assignments = [] } = await req.json();
    if (!trip_id) return Response.json({ error: "trip_id is required" }, { status: 400 });
    if (!Array.isArray(custody_assignments)) {
      return Response.json({ error: "custody_assignments must be an array" }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const trip = await svc.entities.CateringTrip.get(trip_id).catch(() => null);
    if (!trip) return Response.json({ error: "Trip not found" }, { status: 404 });

    const clean = custody_assignments
      .filter((a: any) => CUSTODY_STAGES.includes(a?.stage) && a?.assigned_email)
      .map((a: any) => ({
        stage: a.stage,
        assigned_email: String(a.assigned_email).trim().toLowerCase(),
        assigned_name: a.assigned_name || "",
      }));

    const previous = (trip.custody_assignments || []) as any[];
    const prevFor = (stage: string) =>
      (previous.find((p) => p.stage === stage)?.assigned_email || "").toLowerCase();

    // Only people whose stage assignment actually changed get notified, so
    // re-saving the panel never spams the whole chain.
    const changed = clean.filter((a) => prevFor(a.stage) !== a.assigned_email);

    await svc.entities.CateringTrip.update(trip_id, { custody_assignments: clean });

    const [settingsRows, employees] = await Promise.all([
      svc.entities.CateringSettings.list(),
      svc.entities.Employee.list("-created_date", 500),
    ]);
    const emailsEnabled = settingsRows[0] ? settingsRows[0].custody_emails_enabled !== false : true;

    const notified: string[] = [];
    for (const a of changed) {
      const label = CUSTODY_STAGE_LABELS[a.stage] || a.stage;
      const title = `Equipment custody: ${label}`;
      const message = `You are responsible for the "${label}" handover on trip "${trip.trip_label || "Trip"}"${
        trip.event_name ? ` for ${trip.event_name}` : ""
      }${trip.event_date ? ` on ${trip.event_date}` : ""}. Open "My Custody" to count the items and confirm the handover.`;
      const sent = await sendCustodyNotification({ svc, trip, assignment: a, title, message, emailsEnabled, employees });
      if (sent) notified.push(a.assigned_email);
    }

    return Response.json({ success: true, saved: clean.length, notified });
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
