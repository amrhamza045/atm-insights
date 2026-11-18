import { base44 } from "@/api/base44Client";

// The server (cateringPaymentPolicy) applies and enforces payment policies on
// events; these helpers call it and preview which policy a date falls under.

export const POLICY_FIELDS = [
  "payment_policy_id", "payment_policy_name", "payment_policy", "payment_policy_booked_on",
  "payment_policy_event_date", "payment_policy_days_ahead", "policy_approval_status",
  "policy_approval_decided_by", "policy_approval_decided_at", "policy_approval_note",
];

export const hasPaymentPolicy = (event) => !!event?.payment_policy_id;

/** Event data without the policy fields only the server may write. */
export const withoutPolicyFields = (data) =>
  Object.fromEntries(Object.entries(data).filter(([key]) => !POLICY_FIELDS.includes(key)));

export async function callPaymentPolicy(action, body = {}) {
  try {
    const { data } = await base44.functions.invoke("cateringPaymentPolicy", { action, ...body });
    return data;
  } catch (e) {
    throw new Error(e?.response?.data?.error || e.message);
  }
}

/** Re-applies the policy after a reschedule and rebuilds the deposit from the live payments. */
export const refreshEventPolicy = (eventId) => callPaymentPolicy("refresh", { event_id: eventId });

const noLimit = (v) => v === null || v === undefined || v === "";

/** Preview only: the policy a booking made daysAhead before the event falls under (the server decides). */
export function matchPolicy(policies, daysAhead) {
  return policies
    .filter((p) => p.is_active !== false && daysAhead >= (Number(p.min_days_before) || 0)
      && (noLimit(p.max_days_before) || daysAhead < Number(p.max_days_before)))
    .sort((a, b) => (Number(b.min_days_before) || 0) - (Number(a.min_days_before) || 0))[0] || null;
}