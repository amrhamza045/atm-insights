// Pure conflict-detection rules for the catering calendar (v2).
// No React, no fetching — every function takes plain arrays and returns plain data,
// so the rules stay unit-testable and the hook stays thin.
import { ACTIVE_RES_STATUSES, openMaintenanceQty } from "@/components/catering/equipmentLogic";
import { isCancelled } from "./calendarEventStyle";

export function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || "").trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// null = "cannot tell" (a time is missing). true/false = a real answer.
// Half-open intervals, so back-to-back events (ends 14:00 / starts 14:00) don't clash.
export function timeRangesOverlap(aStart, aEnd, bStart, bEnd) {
  const a1 = toMinutes(aStart), a2 = toMinutes(aEnd);
  const b1 = toMinutes(bStart), b2 = toMinutes(bEnd);
  if (a1 === null || a2 === null || b1 === null || b2 === null) return null;
  return a1 < b2 && b1 < a2;
}

const dateKey = (v) => String(v || "").slice(0, 10);
const normVenue = (v) => String(v || "").trim().toLowerCase();

function groupBy(list, keyFn) {
  const map = {};
  (list || []).forEach((item) => {
    const k = keyFn(item);
    if (!k) return;
    map[k] = map[k] || [];
    map[k].push(item);
  });
  return map;
}

function push(target, eventId, item) {
  if (!eventId) return;
  target[eventId] = target[eventId] || [];
  target[eventId].push(item);
}

// Cancelled events neither raise conflicts nor absorb them.
export function conflictCandidates(events = []) {
  return events.filter((e) => e && e.id && e.event_date && !isCancelled(e));
}

/* ---------------------------------- venue ---------------------------------- */
// Off-site, same venue, same date, overlapping times = hard.
// On-site, same branch, same date, overlapping times = soft (a branch can run parallel halls).
export function detectVenueConflicts(events = []) {
  const out = {};
  const byDate = groupBy(conflictCandidates(events), (e) => dateKey(e.event_date));

  Object.values(byDate).forEach((sameDay) => {
    for (let i = 0; i < sameDay.length; i++) {
      for (let j = i + 1; j < sameDay.length; j++) {
        const a = sameDay[i], b = sameDay[j];
        const offSite = a.location_type === "off_site" && b.location_type === "off_site";
        const onSite = a.location_type !== "off_site" && b.location_type !== "off_site";

        let matches = false;
        let severity = "hard";
        let scope = "";
        if (offSite && normVenue(a.venue_name) && normVenue(a.venue_name) === normVenue(b.venue_name)) {
          matches = true;
          severity = "hard";
          scope = a.venue_name;
        } else if (onSite && a.branch_id && a.branch_id === b.branch_id) {
          matches = true;
          severity = "soft";
          scope = a.branch_name || "same branch";
        }
        if (!matches) continue;

        const overlap = timeRangesOverlap(a.start_time, a.end_time, b.start_time, b.end_time);
        if (overlap === false) continue;
        const timesMissing = overlap === null;

        const window = (e) => [e.start_time, e.end_time].filter(Boolean).join("–");
        const make = (self, other) => ({
          type: "venue",
          severity,
          timesMissing,
          label: onSite ? `Same branch — ${scope}` : scope,
          detail: timesMissing
            ? "Same date, times not set — verify"
            : `Overlaps ${window(other)}${window(self) ? ` (this event ${window(self)})` : ""}`,
          others: [{ id: other.id, name: other.event_name || "Untitled event" }],
        });

        push(out, a.id, make(a, b));
        push(out, b.id, make(b, a));
      }
    }
  });
  return out;
}

/* ---------------------------------- staff ---------------------------------- */
// Same employee, same date, overlapping times, confirmed assignments only.
export function detectStaffConflicts(events = [], assignments = []) {
  const out = {};
  const liveIds = new Set(conflictCandidates(events).map((e) => e.id));
  const nameById = {};
  events.forEach((e) => { nameById[e.id] = e.event_name || "Untitled event"; });

  const active = (assignments || []).filter(
    (a) => a && a.status === "confirmed" && a.employee_id && liveIds.has(a.event_id)
  );
  const byPersonDate = groupBy(active, (a) => `${dateKey(a.event_date)}|${a.employee_id}`);

  Object.values(byPersonDate).forEach((rows) => {
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i], b = rows[j];
        if (a.event_id === b.event_id) continue;

        const overlap = timeRangesOverlap(a.start_time, a.end_time, b.start_time, b.end_time);
        if (overlap === false) continue;
        const timesMissing = overlap === null;

        const window = (r) => [r.start_time, r.end_time].filter(Boolean).join("–");
        const make = (self, other) => ({
          type: "staff",
          severity: "hard",
          timesMissing,
          isOverride: !!(self.availability_conflict && self.override_by),
          override: self.availability_conflict && self.override_by
            ? { by: self.override_by, reason: self.override_reason || self.conflict_detail }
            : null,
          label: `${self.employee_name || "Staff member"}${self.role_name ? ` (${self.role_name})` : ""}`,
          detail: timesMissing
            ? `Also assigned to ${nameById[other.event_id] || "another event"} — times not set`
            : `Also assigned to ${nameById[other.event_id] || "another event"}, ${window(other)}`,
          others: [{ id: other.event_id, name: nameById[other.event_id] || "Untitled event" }],
        });

        push(out, a.event_id, make(a, b));
        push(out, b.event_id, make(b, a));
      }
    }
  });
  return out;
}

/* -------------------------------- equipment -------------------------------- */
// Unit-mode: the same unit_id held twice on one date.
// Bulk-mode: quantity-aware — only a conflict when summed same-date demand beats stock.
export function detectEquipmentConflicts(events = [], reservations = [], equipment = [], maintenance = []) {
  const out = {};
  const liveIds = new Set(conflictCandidates(events).map((e) => e.id));
  const nameById = {};
  events.forEach((e) => { nameById[e.id] = e.event_name || "Untitled event"; });
  const catalogById = {};
  (equipment || []).forEach((eq) => { catalogById[eq.id] = eq; });

  const active = (reservations || []).filter(
    (r) => r && ACTIVE_RES_STATUSES.includes(r.status) && liveIds.has(r.event_id)
  );

  const overrideOf = (r) =>
    r.had_conflict && r.override_by ? { by: r.override_by, reason: r.override_reason || r.conflict_detail } : null;

  // --- unit-mode: one physical unit cannot be in two places on one day ---
  const byUnit = groupBy(
    active.filter((r) => r.unit_id),
    (r) => `${dateKey(r.event_date)}|${r.unit_id}`
  );
  Object.values(byUnit).forEach((rows) => {
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i], b = rows[j];
        if (a.event_id === b.event_id) continue;
        const make = (self, other) => ({
          type: "equipment",
          severity: "soft",
          isOverride: !!overrideOf(self),
          override: overrideOf(self),
          label: `${self.equipment_name || "Equipment"}${self.unit_code ? ` (${self.unit_code})` : ""}`,
          detail: `Same unit also reserved for ${nameById[other.event_id] || "another event"}`,
          others: [{ id: other.event_id, name: nameById[other.event_id] || "Untitled event" }],
        });
        push(out, a.event_id, make(a, b));
        push(out, b.event_id, make(b, a));
      }
    }
  });

  // --- bulk-mode: only flag when the pool genuinely cannot cover the day ---
  const byBulk = groupBy(
    active.filter((r) => !r.unit_id && r.equipment_id),
    (r) => `${dateKey(r.event_date)}|${r.equipment_id}`
  );
  Object.values(byBulk).forEach((rows) => {
    const eventIds = [...new Set(rows.map((r) => r.event_id))];
    if (eventIds.length < 2) return;

    const first = rows[0];
    const catalog = catalogById[first.equipment_id] || {};
    const total = Number(catalog.total_quantity) || 0;
    const available = Math.max(0, total - openMaintenanceQty(first.equipment_id, maintenance));
    const demand = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    if (demand <= available) return;

    const label = first.equipment_name || catalog.name || "Equipment";
    const unitLabel = first.unit_label || catalog.unit_label || "pcs";
    const detail = `${demand} ${unitLabel} needed across ${eventIds.length} events, ${available} available (short ${demand - available})`;

    eventIds.forEach((eventId) => {
      const mine = rows.filter((r) => r.event_id === eventId);
      const override = mine.map(overrideOf).find(Boolean) || null;
      push(out, eventId, {
        type: "equipment",
        severity: "soft",
        isOverride: !!override,
        override,
        label,
        detail,
        others: eventIds
          .filter((id) => id !== eventId)
          .map((id) => ({ id, name: nameById[id] || "Untitled event" })),
      });
    });
  });

  return out;
}

/* --------------------------------- assembly -------------------------------- */
// Overridden conflicts are shown but never escalate the chip.
export function severityOf(groups) {
  const all = [...(groups.venue || []), ...(groups.staff || []), ...(groups.equipment || [])];
  if (all.length === 0) return null;
  const live = all.filter((i) => !i.isOverride);
  if (live.some((i) => i.severity === "hard")) return "hard";
  if (live.some((i) => i.severity === "soft")) return "soft";
  return "override";
}

// Merges the three passes into { [eventId]: { severity, count, groups } }.
export function buildConflictMap({ events = [], assignments = [], reservations = [], equipment = [], maintenance = [] }) {
  const venue = detectVenueConflicts(events);
  const staff = detectStaffConflicts(events, assignments);
  const equip = detectEquipmentConflicts(events, reservations, equipment, maintenance);

  const out = {};
  new Set([...Object.keys(venue), ...Object.keys(staff), ...Object.keys(equip)]).forEach((id) => {
    const groups = { venue: venue[id] || [], staff: staff[id] || [], equipment: equip[id] || [] };
    out[id] = {
      groups,
      severity: severityOf(groups),
      count: groups.venue.length + groups.staff.length + groups.equipment.length,
    };
  });
  return out;
}