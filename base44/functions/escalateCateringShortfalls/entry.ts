import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getEffectivePermissions } from '../../shared/resolveEffectivePermissions.js';
import { isCentralAdmin } from '../../shared/platformRole.js';
import { getJobNumber } from '../../shared/scheduleGate.js';
import { guardScheduledJob, anonymousDone } from '../../shared/jobGuard.js';
import { getCompanyOffset, TIMEZONE_MISSING, companyDay } from '../../shared/companyTimezone.js';

// Scheduled job: flags catering material shortfalls as at-risk using each
// material's OWN procurement lead time (InventoryItem.lead_time_days, default 2)
// rather than a single global threshold — fresh chicken escalates late,
// long-lead dry goods escalate early. A shortfall is at-risk when it is still
// uncovered (procurement_status none/po_pending) and the days remaining to its
// needed_by_date are within the item's lead time. No emails in v1.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    // Phase 5 job guard: signed-in callers must be central admins; no-user calls
    // run only in their slot, once per slot, and get back only done/skipped.
    const guard = await guardScheduledJob(base44, await req.json().catch(() => ({})), {
      key: 'escalateCateringShortfalls',
      slot: { hour: 'shortfall_escalation_hour' },
      authorize: async (b, user) => {
        const permissions = await getEffectivePermissions(b, user);
        return isCentralAdmin(user, permissions) ? null : Response.json({ error: 'Access denied' }, { status: 403 });
      },
    });
    if (guard.denied) return guard.denied;
    if (guard.skipped) return guard.skipped;
    const svc = base44.asServiceRole;

    const [reservations, items] = await Promise.all([
      svc.entities.CateringReservation.filter({ status: "reserved" }, "-created_date", 1000),
      svc.entities.InventoryItem.list("-created_date", 1000),
    ]);

    const defaultLead = await getJobNumber(svc, 'default_lead_time_days');
    const leadOf = new Map(
      items.map((i) => [i.id, Number(i.lead_time_days) > 0 ? Number(i.lead_time_days) : defaultLead])
    );
    // "Today" is the company-local date; needed-by dates are plain dates, compared as UTC midnights.
    const offset = await getCompanyOffset(svc.entities);
    if (offset === null) return Response.json({ error: TIMEZONE_MISSING }, { status: 400 });
    const todayStr = companyDay(offset);
    const today = new Date(`${todayStr}T00:00:00Z`);

    const updates = [];
    const flagged = [];
    for (const r of reservations) {
      const uncovered =
        (Number(r.shortfall_quantity) || 0) > 0 &&
        ["none", "po_pending"].includes(r.procurement_status || "none");

      let shouldBeAtRisk = false;
      let daysLeft = null;
      let lead = null;
      if (uncovered) {
        const needed = new Date(r.needed_by_date || r.event_date || "");
        if (!isNaN(needed.getTime())) {
          daysLeft = Math.ceil((needed.getTime() - today.getTime()) / 86400000);
          lead = leadOf.get(r.inventory_item_id) ?? defaultLead;
          shouldBeAtRisk = daysLeft <= lead;
        }
      }

      if (shouldBeAtRisk !== !!r.at_risk) {
        const update = { id: r.id, at_risk: shouldBeAtRisk };
        if (shouldBeAtRisk) {
          const note = `[at-risk ${todayStr}] ${daysLeft} day(s) to needed-by vs ${lead}-day lead time — still uncovered (${r.procurement_status || "none"}).`;
          update.notes = r.notes ? `${r.notes}\n${note}` : note;
          flagged.push({
            reservation_id: r.id,
            event_id: r.event_id,
            event_name: r.event_name,
            item: r.inventory_item_name,
            quantity_short: r.shortfall_quantity,
            needed_by_date: r.needed_by_date || r.event_date,
            days_left: daysLeft,
            lead_time_days: lead,
          });
        }
        updates.push(update);
      }
    }

    if (updates.length) await svc.entities.CateringReservation.bulkUpdate(updates);

    // Re-sync each affected event's shortfall rollup so dashboards stay honest.
    const eventIds = [...new Set(reservations.filter((r) => (Number(r.shortfall_quantity) || 0) > 0).map((r) => r.event_id).filter(Boolean))];
    for (const eventId of eventIds) {
      const rows = reservations.filter((r) => r.event_id === eventId);
      const openShortfalls = rows.filter(
        (r) => (Number(r.shortfall_quantity) || 0) > 0 &&
          !["po_pending", "po_approved", "po_delivered"].includes(r.procurement_status || "none")
      );
      const shortfalls = rows.filter((r) => (Number(r.shortfall_quantity) || 0) > 0);
      await svc.entities.CateringEvent.update(eventId, {
        open_shortfall_count: openShortfalls.length,
        reservation_shortfall_count: shortfalls.length,
        reservation_status: openShortfalls.length > 0 ? "shortfall" : "reserved",
      }).catch(() => {});
    }

    if (guard.anonymous) return anonymousDone();
    return Response.json({
      success: true,
      scanned: reservations.length,
      changed: updates.length,
      newly_at_risk: flagged.length,
      events_synced: eventIds.length,
      flagged,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}