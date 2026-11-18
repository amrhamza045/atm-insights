import { base44 } from "@/api/base44Client";

export const OUTFLOWS = ["refund", "deposit_withdrawal"];

// Net approved funds retained: completed inflows minus completed refunds/withdrawals.
// Always read fresh so the floor reflects the latest approved payments.
export async function fetchRetainedFunds(eventId) {
  const payments = await base44.entities.CateringPayment.filter({ event_id: eventId, status: "completed" });
  const net = payments.reduce((sum, p) => sum + (OUTFLOWS.includes(p.payment_type) ? -1 : 1) * (Number(p.amount) || 0), 0);
  return Math.max(0, Math.round(net * 100) / 100);
}