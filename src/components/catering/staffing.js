import { base44 } from "@/api/base44Client";
import { excludeSystemAccounts } from "@/components/hr/systemAccount";
import { round2, daysUntil } from "./cateringLogic";
import { syncEventBilling } from "./serviceBilling";

const DEFAULT_ROLES = [
  { name: "Event Manager", department: "Management", guests_per_staff: 150, min_count: 1, is_critical: true, required_skills: ["large event management"], sort_order: 1 },
  { name: "Chef", department: "Kitchen", guests_per_staff: 80, min_count: 1, is_critical: true, required_skills: ["food handling certificate"], sort_order: 2 },
  { name: "Sous Chef", department: "Kitchen", guests_per_staff: 120, min_count: 0, is_critical: false, required_skills: ["food handling certificate"], sort_order: 3 },
  { name: "Waiter", department: "Front-of-House", guests_per_staff: 20, min_count: 2, is_critical: true, required_skills: ["large event service"], sort_order: 4 },
  { name: "Bartender", department: "Front-of-House", guests_per_staff: 75, min_count: 0, is_critical: false, required_skills: ["mixology"], sort_order: 5 },
  { name: "Host", department: "Front-of-House", guests_per_staff: 150, min_count: 1, is_critical: false, sort_order: 6 },
  { name: "Cashier", department: "Front-of-House", guests_per_staff: 200, min_count: 0, is_critical: false, sort_order: 7 },
  { name: "Driver", department: "Logistics", guests_per_staff: 150, min_count: 0, is_critical: false, required_skills: ["driving licence"], sort_order: 8 },
  { name: "Cleaner", department: "Logistics", guests_per_staff: 100, min_count: 1, is_critical: false, sort_order: 9 },
  { name: "Security", department: "Logistics", guests_per_staff: 120, min_count: 0, is_critical: false, sort_order: 10 },
];

/** Seed the role catalogue once so staffing works out of the box; never overwrites edits. */
export async function getStaffingRoles() {
  let roles = await base44.entities.CateringStaffingRole.list("sort_order", 100);
  if (roles.length === 0) {
    await base44.entities.CateringStaffingRole.bulkCreate(
      DEFAULT_ROLES.map((r) => ({ ...r, matches_positions: [r.name], is_active: true, default_hourly_rate: 0 }))
    );
    roles = await base44.entities.CateringStaffingRole.list("sort_order", 100);
  }
  return roles.filter((r) => r.is_active !== false);
}

/** Guest-count + event-type driven suggestion. Purely a starting point. */
export function suggestRequirements(event, roles) {
  const guests = Number(event?.expected_guests) || 0;
  return roles
    .filter((r) => !r.applies_to_event_types?.length || r.applies_to_event_types.includes(event?.event_type))
    .map((r) => {
      const ratio = Number(r.guests_per_staff) || 0;
      const scaled = ratio > 0 ? Math.ceil(guests / ratio) : 0;
      const count = Math.max(scaled, Number(r.min_count) || 0);
      return {
        role_id: r.id,
        role_name: r.name,
        required_count: count,
        suggested_count: count,
        is_critical: !!r.is_critical,
      };
    })
    .filter((r) => r.required_count > 0);
}

/**
 * Re-suggesting must track the guest count in BOTH directions. Taking
 * max(existing, suggested) froze counts at their highest-ever value, so lowering
 * the guest count (or fixing an over-estimate) changed nothing. Instead any
 * manual bump a planner made *above the previous suggestion* is preserved as a
 * delta and re-applied on top of the fresh ratio-driven number.
 */
export function mergeSuggestion(existingRequirements = [], suggested = []) {
  const merged = suggested.map((s) => {
    const existing = existingRequirements.find((r) => r.role_name === s.role_name);
    if (!existing) return s;
    const manualExtra = Math.max(0, (Number(existing.required_count) || 0) - (Number(existing.suggested_count) || 0));
    return { ...s, required_count: s.required_count + manualExtra };
  });
  const extras = existingRequirements.filter((r) => !merged.some((m) => m.role_name === r.role_name));
  return [...merged, ...extras];
}

const toMinutes = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

export function overlaps(aStart, aEnd, bStart, bEnd) {
  const s1 = toMinutes(aStart), e1 = toMinutes(aEnd), s2 = toMinutes(bStart), e2 = toMinutes(bEnd);
  if (s1 === null || e1 === null || s2 === null || e2 === null) return true; // unknown times = treat as clashing
  const end1 = e1 <= s1 ? e1 + 1440 : e1;
  const end2 = e2 <= s2 ? e2 + 1440 : e2;
  return s1 < end2 && s2 < end1;
}

const dayName = (dateStr) =>
  ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(`${dateStr}T00:00:00`).getDay()];

function repeatingCoversDate(shift, dateStr) {
  if (!shift.is_repeating) return false;
  const day = dayName(dateStr);
  if (!(shift.repeat_days || []).includes(day)) return false;
  if ((shift.weekends_off || []).includes(day)) return false;
  if (shift.repeat_start_date && dateStr < shift.repeat_start_date) return false;
  if (shift.repeat_end_date && dateStr > shift.repeat_end_date) return false;
  return true;
}

/** Default call/release window: one hour of setup before, one hour of breakdown after. */
export function defaultWindow(event) {
  const shift = (t, delta) => {
    const m = toMinutes(t);
    if (m === null) return "";
    const v = (m + delta + 1440) % 1440;
    return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
  };
  const start = shift(event?.start_time, -60) || "08:00";
  const end = shift(event?.end_time, 60) || "";
  return { start_time: start, end_time: end || shift(start, (Number(event?.duration_hours) || 4) * 60 + 120) };
}

export function hoursBetween(start, end) {
  const s = toMinutes(start), e = toMinutes(end);
  if (s === null || e === null) return 0;
  let mins = e - s;
  if (mins <= 0) mins += 1440;
  return round2(mins / 60);
}

/**
 * Availability + skill matching for one event window.
 * A candidate is unavailable when an existing shift (regular or catering) or another
 * confirmed catering assignment overlaps the window on the same date.
 */
export async function buildCandidates({ event, role, window, branchId }) {
  const [employees, shifts, assignments] = await Promise.all([
    base44.entities.Employee.filter({ status: "active" }, "name", 500).then(excludeSystemAccounts),
    base44.entities.Shift.list("-created_date", 1000),
    base44.entities.CateringAssignment.filter({ event_date: event.event_date, status: "confirmed" }),
  ]);
  // Pay rates never reach the screen — the server returns only the cost for this window.
  const hours = hoursBetween(window.start_time, window.end_time);
  const { data: { costs = {} } } = await base44.functions.invoke("getCateringStaffRates", { employee_ids: employees.map((e) => e.id), hours });
  const roleRate = Number(role?.default_hourly_rate) || 0;

  const positions = (role?.matches_positions || []).map((p) => p.toLowerCase());
  const skills = role?.required_skills || [];

  return employees
    .filter((e) => !branchId || !e.branch_id || e.branch_id === branchId || e.employment_type !== "regular")
    .map((emp) => {
      const clashShift = shifts.find(
        (s) =>
          s.employee_id === emp.id &&
          s.status !== "cancelled" &&
          (s.shift_date === event.event_date || repeatingCoversDate(s, event.event_date)) &&
          overlaps(window.start_time, window.end_time, s.start_time, s.end_time)
      );
      const clashAssignment = assignments.find(
        (a) => a.employee_id === emp.id && a.event_id !== event.id && overlaps(window.start_time, window.end_time, a.start_time, a.end_time)
      );

      const conflict = clashAssignment
        ? `Already staffed on "${clashAssignment.event_name}" (${clashAssignment.role_name}) ${clashAssignment.start_time}–${clashAssignment.end_time}`
        : clashShift
        ? clashShift.catering_event_id
          ? `Already on a catering shift for "${clashShift.catering_event_name}" ${clashShift.start_time}–${clashShift.end_time}`
          : `Already on a branch shift ${clashShift.start_time}–${clashShift.end_time}`
        : "";

      const empSkills = (emp.skills || []).map((s) => s.toLowerCase());
      const matchedSkills = skills.filter((s) => empSkills.includes(s.toLowerCase()));
      const positionMatch = positions.length === 0 || positions.includes((emp.position || "").toLowerCase());

      let score = 0;
      if (positionMatch) score += 40;
      if ((emp.department || "") === (role?.department || "")) score += 10;
      score += matchedSkills.length * 15;
      score += Math.min(20, (Number(emp.catering_events_worked) || 0) * 2);
      if ((Number(emp.largest_event_guests) || 0) >= (Number(event.expected_guests) || 0)) score += 10;

      return {
        employee: emp,
        available: !conflict,
        conflict,
        positionMatch,
        matchedSkills,
        score,
        // "employee" = own rate held server-side; "role" = the public role default.
        rateSource: costs[emp.id] ? "employee" : roleRate ? "role" : "none",
        cost: costs[emp.id] ?? round2(roleRate * hours),
      };
    })
    .sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0) || b.score - a.score);
}

/** Confirming an assignment creates the actual Shift, so attendance and payroll flow as usual. */
export async function confirmAssignment({ event, role, requirement, candidate, window, branch, userEmail, override, checkInLocation }) {
  if (!candidate.available && !override?.reason) {
    throw new Error("This person is already booked — an override reason is required.");
  }

  const hours = hoursBetween(window.start_time, window.end_time);
  // Freelance/temporary staff have no system-wide rate — a rate entered for this
  // specific assignment wins over the employee/role fallback.
  // The server turns the rate into a cost once, at confirmation; only the cost is stored.
  const manualRate = Number(candidate.rateOverride) > 0 ? Number(candidate.rateOverride) : 0;

  const shift = await base44.entities.Shift.create({
    branch_id: event.branch_id,
    branch_name: event.branch_name || branch?.name,
    employee_id: candidate.employee.id,
    employee_name: candidate.employee.name,
    shift_date: event.event_date,
    start_time: window.start_time,
    end_time: window.end_time,
    expected_hours: hours,
    is_repeating: false,
    shift_source: "catering",
    catering_event_id: event.id,
    catering_event_name: event.event_name,
    catering_role: requirement.role_name,
    status: "scheduled",
    notes: `Catering event: ${event.event_name}`,
  });

  const assignment = await base44.entities.CateringAssignment.create({
    branch_id: event.branch_id,
    branch_name: event.branch_name || branch?.name,
    event_id: event.id,
    event_name: event.event_name,
    event_date: event.event_date,
    role_id: requirement.role_id,
    role_name: requirement.role_name,
    is_critical_role: !!requirement.is_critical,
    check_in_location_type: checkInLocation || "branch",
    employee_id: candidate.employee.id,
    employee_name: candidate.employee.name,
    employment_type: candidate.employee.employment_type || "regular",
    start_time: window.start_time,
    end_time: window.end_time,
    expected_hours: hours,
    estimated_cost: 0,
    shift_id: shift.id,
    status: "confirmed",
    availability_conflict: !candidate.available,
    conflict_detail: candidate.conflict || "",
    override_by: !candidate.available ? userEmail : undefined,
    override_reason: !candidate.available ? override?.reason : undefined,
    match_score: candidate.score,
    assigned_by: userEmail,
  });

  await base44.entities.Shift.update(shift.id, { catering_assignment_id: assignment.id });
  const { data: stamped } = await base44.functions.invoke("getCateringStaffRates", {
    action: "stamp", assignment_id: assignment.id, manual_rate: manualRate || undefined,
  });
  assignment.estimated_cost = stamped?.estimated_cost || 0;

  // Experience signals for future matching. Runs server-side so catering staff
  // never need direct write access to the Employee entity.
  await base44.functions.invoke("recordCateringStaffExperience", {
    employeeId: candidate.employee.id,
    eventGuests: Number(event.expected_guests) || 0,
  });

  await recalcStaffing(event);
  return assignment;
}

export async function releaseAssignment({ assignment, userEmail, reason, event }) {
  if (assignment.shift_id) {
    await base44.entities.Shift.update(assignment.shift_id, {
      status: "cancelled",
      notes: `Released from catering event: ${reason || "staffing change"}`,
    });
  }
  await base44.entities.CateringAssignment.update(assignment.id, {
    status: "released",
    released_by: userEmail,
    released_date: new Date().toISOString(),
    notes: reason || "",
  });
  if (event) await recalcStaffing(event);
}

/** Release every assignment for an event (used when the event is cancelled). */
export async function releaseEventStaffing({ eventId, userEmail, reason }) {
  const assignments = await base44.entities.CateringAssignment.filter({ event_id: eventId, status: "confirmed" });
  for (const a of assignments) {
    await releaseAssignment({ assignment: a, userEmail, reason });
  }
  return assignments.length;
}

export async function recalcStaffing(event) {
  const assignments = await base44.entities.CateringAssignment.filter({ event_id: event.id, status: "confirmed" });
  const requirements = event.staffing_requirements || [];

  const requiredTotal = requirements.reduce((s, r) => s + (Number(r.required_count) || 0), 0);
  const filledFor = (roleName) => assignments.filter((a) => a.role_name === roleName).length;
  const unfilledCritical = requirements.filter((r) => r.is_critical && filledFor(r.role_name) < (Number(r.required_count) || 0)).length;
  const laborCost = round2(assignments.reduce((s, a) => s + (Number(a.estimated_cost) || 0), 0));

  const status =
    requiredTotal === 0
      ? assignments.length > 0
        ? "partially_staffed"
        : "none"
      : requirements.every((r) => filledFor(r.role_name) >= (Number(r.required_count) || 0))
      ? "fully_staffed"
      : assignments.length > 0
      ? "partially_staffed"
      : "planned";

  await base44.entities.CateringEvent.update(event.id, {
    staffing_status: status,
    staffing_assigned_count: assignments.length,
    staffing_required_count: requiredTotal,
    staffing_unfilled_critical_count: unfilledCritical,
    estimated_labor_cost: laborCost,
  });

  // Staffing is billed to the customer, so the deposit and balance move with it
  await syncEventBilling(event);

  return { assignments, requiredTotal, unfilledCritical, laborCost, status };
}

/** Critical roles unfilled with the event closing in — surfaced as an alert. */
export function staffingAlert(event, alertWithinDays = 7) {
  const days = daysUntil(event?.event_date);
  const unfilled = Number(event?.staffing_unfilled_critical_count) || 0;
  if (unfilled <= 0 || days < 0 || days > alertWithinDays) return null;
  return `${unfilled} critical role(s) unfilled with ${days} day(s) to go`;
}