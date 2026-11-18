import { round2 } from "./cateringLogic";

/**
 * A deposit's minimum in the payment form. Under a payment policy it can't be less than what
 * the policy's first payment (the event's required deposit) still needs after the deposits
 * already paid; the % box starts at that amount, rounded down so the policy amount itself is
 * allowed. Raising the % raises the minimum; lowering it never takes it below the policy.
 * Without a policy the % box starts at 50% and sets the minimum alone.
 */
export function depositMinimum(event, { grandTotal, outstanding, pct }) {
  const hasPolicy = !!event.payment_policy_id;
  const stillNeeded = (Number(event.required_deposit_amount) || 0) - (Number(event.deposit_paid_amount) || 0);
  const policyFloor = hasPolicy ? round2(Math.min(outstanding, Math.max(0, stillNeeded))) : 0;
  const startPct = !hasPolicy ? 50 : grandTotal > 0 ? Math.floor((policyFloor / grandTotal) * 10000 + 1e-6) / 100 : 0;
  const percent = pct ?? startPct;
  const pctAmount = round2((grandTotal * (Number(percent) || 0)) / 100);
  return {
    percent,
    pctAmount,
    policyFloor,
    policyName: event.payment_policy_name || event.payment_policy?.name || "",
    minimum: Math.max(pctAmount, policyFloor),
  };
}