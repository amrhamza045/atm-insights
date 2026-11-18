/**
 * Attendance calculation utility.
 * Given a policy, a shift preset, actual sign-in/out times, and the employee's hourly rate,
 * computes late minutes, early leave, overtime, deductions, and net earnings.
 */

/**
 * Convert "HH:MM" to minutes since midnight.
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Convert minutes since midnight to "HH:MM" 24h.
 */
export function minutesToTime(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Convert "HH:MM" to 12h display like "10:00 AM".
 */
export function to12h(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${period}`;
}

/**
 * Calculate the duration of a shift in hours, handling overnight shifts.
 * e.g., start 22:00, end 06:00 = 8 hours
 */
export function shiftDurationHours(startTime, endTime) {
  let start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end < start) end += 24 * 60; // overnight
  return (end - start) / 60;
}

/**
 * Find the tier that applies to a given number of late/early minutes.
 * Tiers are evaluated in order; the first tier whose max_minutes >= actual minutes applies.
 * If no tier matches (minutes exceed all tiers), the last (highest) tier applies.
 */
function findTierDeduction(tiers, minutes) {
  if (!tiers || tiers.length === 0) return { amount: 0, label: "" };
  for (const tier of tiers) {
    if (minutes <= tier.max_minutes) {
      return { amount: tier.deduction_amount || 0, label: tier.label || "" };
    }
  }
  const last = tiers[tiers.length - 1];
  return { amount: last.deduction_amount || 0, label: last.label || "" };
}

/**
 * Calculate deduction for late arrival or early leave.
 */
function calcDeduction(mode, perHour, tiers, minutes) {
  if (mode === "no_penalty" || minutes <= 0) return { amount: 0, label: "" };
  if (mode === "fixed_hourly") {
    const amount = (minutes / 60) * (perHour || 0);
    return { amount, label: `${minutes} min @ ${(perHour || 0).toFixed(0)}/hr` };
  }
  // gradual_tiers
  return findTierDeduction(tiers, minutes);
}

/**
 * Main calculation function.
 * @param {object} policy - AttendancePolicy entity record
 * @param {object} shiftPreset - { label, start_time, end_time }
 * @param {string} signInISO - ISO timestamp of actual sign-in
 * @param {string} signOutISO - ISO timestamp of actual sign-out (may be null)
 * @param {number} hourlyRate - Employee's hourly rate
 * @returns {object} Calculation result
 */
export function calculateAttendance(policy, shiftPreset, signInISO, signOutISO, hourlyRate) {
  const result = {
    assigned_shift_label: shiftPreset?.label || "",
    assigned_shift_start: shiftPreset?.start_time || "",
    assigned_shift_end: shiftPreset?.end_time || "",
    shift_expected_hours: 0,
    late_minutes: 0,
    early_leave_minutes: 0,
    overtime_hours: 0,
    regular_hours: 0,
    overtime_earnings: 0,
    regular_earnings: 0,
    deduction_amount: 0,
    deduction_breakdown: "",
    calculated_earnings: 0,
    hours_worked: 0,
    status: "present",
  };

  if (!shiftPreset || !signInISO) return result;

  const expectedHours = shiftDurationHours(shiftPreset.start_time, shiftPreset.end_time);
  result.shift_expected_hours = expectedHours;

  const signIn = new Date(signInISO);
  const signOut = signOutISO ? new Date(signOutISO) : null;
  // An open or invalid session has no finalized worked hours or earnings.
  if (!signOut || !Number.isFinite(signIn.getTime()) || !Number.isFinite(signOut.getTime()) || signOut < signIn) return result;

  // Build shift start/end as Date objects on the sign-in day
  const shiftStart = new Date(signIn);
  const [sh, sm] = (shiftPreset.start_time || "00:00").split(":").map(Number);
  shiftStart.setHours(sh, sm, 0, 0);

  const shiftEnd = new Date(shiftStart);
  const [eh, em] = (shiftPreset.end_time || "00:00").split(":").map(Number);
  let endMinutes = eh * 60 + (em || 0);
  let startMinutes = sh * 60 + (sm || 0);
  if (endMinutes <= startMinutes) {
    // overnight shift — shift end is next day
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }
  shiftEnd.setHours(eh, em, 0, 0);

  // Hours worked
  if (signOut) {
    result.hours_worked = Math.max(0, (signOut - signIn) / (1000 * 60 * 60));
  }

  // Late minutes (after grace)
  const graceMinutes = policy?.late_grace_minutes || 0;
  const lateMs = signIn - shiftStart;
  const lateMinRaw = lateMs > 0 ? lateMs / (1000 * 60) : 0;
  result.late_minutes = Math.max(0, Math.round(lateMinRaw - graceMinutes));

  // Early leave minutes
  if (signOut && signOut < shiftEnd) {
    const earlyMs = shiftEnd - signOut;
    result.early_leave_minutes = Math.max(0, Math.round(earlyMs / (1000 * 60)));
  }

  // Overtime hours (worked beyond shift end)
  if (signOut && signOut > shiftEnd) {
    const otMs = signOut - Math.max(shiftEnd.getTime(), signIn.getTime());
    result.overtime_hours = Math.max(0, otMs / (1000 * 60 * 60));
  }

  // Regular hours = expected hours minus late/early shortfall, but not less than 0 and not more than actual worked minus overtime
  const lateHours = result.late_minutes / 60;
  const earlyHours = result.early_leave_minutes / 60;
  const shortfall = lateHours + earlyHours;
  result.regular_hours = Math.max(0, Math.min(expectedHours - shortfall, result.hours_worked - result.overtime_hours));

  // Earnings
  const rate = hourlyRate || 0;
  const otMultiplier = policy?.overtime_rate_multiplier || 1.5;
  result.regular_earnings = result.regular_hours * rate;
  result.overtime_earnings = result.overtime_hours * rate * otMultiplier;

  // Deductions
  const lateDeduction = calcDeduction(
    policy?.late_deduction_mode,
    policy?.late_deduction_per_hour,
    policy?.late_deduction_tiers,
    result.late_minutes
  );
  const earlyDeduction = calcDeduction(
    policy?.early_leave_deduction_mode,
    policy?.early_leave_deduction_per_hour,
    policy?.early_leave_deduction_tiers,
    result.early_leave_minutes
  );
  result.deduction_amount = lateDeduction.amount + earlyDeduction.amount;

  const breakdownParts = [];
  if (lateDeduction.amount > 0) {
    breakdownParts.push(`Late ${result.late_minutes}min: -${lateDeduction.amount.toFixed(2)} EGP`);
  }
  if (earlyDeduction.amount > 0) {
    breakdownParts.push(`Early ${result.early_leave_minutes}min: -${earlyDeduction.amount.toFixed(2)} EGP`);
  }
  result.deduction_breakdown = breakdownParts.join(", ");

  // Net earnings
  result.calculated_earnings =
    result.regular_earnings + result.overtime_earnings - result.deduction_amount;

  // Status
  if (!signOut) {
    result.status = "present";
  } else if (result.late_minutes > 0 && result.early_leave_minutes > 0) {
    result.status = "late";
  } else if (result.late_minutes > 0) {
    result.status = "late";
  } else if (result.early_leave_minutes > 0) {
    result.status = "early_leave";
  } else {
    result.status = "completed";
  }

  return result;
}

/**
 * Default shift presets matching the user's examples.
 */
export const DEFAULT_SHIFT_PRESETS = [
  { label: "10:00 AM - 06:00 PM", start_time: "10:00", end_time: "18:00" },
  { label: "06:00 PM - 02:00 AM", start_time: "18:00", end_time: "02:00" },
  { label: "10:00 AM - 10:00 PM", start_time: "10:00", end_time: "22:00" },
  { label: "12:00 PM - 12:00 AM", start_time: "12:00", end_time: "00:00" },
  { label: "01:00 PM - 01:00 AM", start_time: "13:00", end_time: "01:00" },
];

/**
 * Default policy tiers for late and early leave.
 */
export const DEFAULT_LATE_TIERS = [
  { max_minutes: 10, deduction_amount: 0, label: "0-10 min (grace)" },
  { max_minutes: 20, deduction_amount: 25, label: "11-20 min" },
  { max_minutes: 30, deduction_amount: 50, label: "21-30 min" },
  { max_minutes: 60, deduction_amount: 100, label: "31-60 min" },
  { max_minutes: 99999, deduction_amount: 200, label: "60+ min" },
];

export const DEFAULT_EARLY_TIERS = [
  { max_minutes: 10, deduction_amount: 0, label: "0-10 min" },
  { max_minutes: 20, deduction_amount: 25, label: "11-20 min" },
  { max_minutes: 30, deduction_amount: 50, label: "21-30 min" },
  { max_minutes: 60, deduction_amount: 100, label: "31-60 min" },
  { max_minutes: 99999, deduction_amount: 200, label: "60+ min" },
];