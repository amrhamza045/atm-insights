import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { scanCateringOrphans } from '../_shared/cateringEventRelations.js';
import { usersWithPermission } from '../_shared/permissionRecipients.js';
import { guardScheduledJob, anonymousDone } from '../_shared/jobGuard.js';
import { loadEmailConfig, sendAndLog } from '../_shared/emailDelivery.js';

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const guard = await guardScheduledJob(base44, await req.json().catch(() => ({})), {
      key: "reportCateringOrphans",
      permission: "catering_approve",
      slot: { hour: "orphan_scan_hour", weekday: "orphan_scan_weekday" },
    });
    if (guard.denied) return guard.denied;
    if (guard.skipped) return guard.skipped;
    const body = guard.body;
    const svc = base44.asServiceRole;
    const report = await scanCateringOrphans(svc);
    if (body.notify === false) return Response.json({ success: true, notified: false, report });

    const [admins, employees] = await Promise.all([
      usersWithPermission(svc, "catering_approve"),
      svc.entities.Employee.list("-created_date", 1000),
    ]);
    const affected = report.entities.filter((row) => row.count > 0);
    const lines = report.entities.map((row) => `${row.label}: ${row.count}${row.count ? ` — ${row.records.map((record) => `${record.id} [missing ${record.missing_event_ids.join(", ")}]`).join("; ")}` : ""}`);
    const summary = report.total_orphans ? `${report.total_orphans} orphan record(s) found across ${affected.length} entity type(s).` : "No catering orphan records found.";
    const html = `<h2>Weekly catering orphan scan</h2><p>${summary}</p><p>Scanned ${report.event_count} catering events at ${report.scanned_at}.</p><pre style="white-space:pre-wrap">${lines.join("\n")}</pre><p>This report is read-only; no records were changed or deleted.</p>`;
    // Admin › Email can turn the email off or change who gets it; the in-app alert always goes to approvers.
    const config = await loadEmailConfig(svc);
    if (config.on("catering_orphan_scan")) {
      const to = await config.recipientsFor("catering_orphan_scan", admins.map((a) => a.email));
      await sendAndLog(svc, { key: "catering_orphan_scan", to, subject: `Weekly catering orphan scan — ${report.total_orphans} found`, html, context: summary });
    }
    for (const admin of admins) {
      const employee = employees.find((row) => (row.email || "").toLowerCase() === admin.email.toLowerCase());
      if (employee) await svc.entities.Notification.create({ recipient_type: "employee", employee_id: employee.id, title: "Weekly catering orphan scan", message: summary, type: "system", entity_type: "catering_orphan_scan", read: false, icon: "shield-check" });
    }
    if (guard.anonymous) return anonymousDone();
    return Response.json({ success: true, notified: true, admin_count: admins.length, report });
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
