import { loadEventMoney, round2 } from './cateringPaymentPosting.js';

// Event cancellation settlement. The policy fee is kept from what the client
// has paid first; a shortfall is collected, a surplus refunded. Each step is a
// normal catering payment (approval + journal), tagged with this prefix in its
// one-time request ID so it can be told apart from ordinary payments.
export const SETTLEMENT_PREFIX = 'cancel-settle:';
export const isSettlement = (p) => String(p?.client_request_id || '').startsWith(SETTLEMENT_PREFIX);

const daysUntil = (date) => {
  if (!date) return 0;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  return Math.round((Date.parse(`${String(date).slice(0, 10)}T00:00:00Z`) - today.getTime()) / 86400000);
};

function resolveFee(policy, days, base) {
  const tiers = (policy?.tiers || []).slice().sort((a, b) => b.min_days_before - a.min_days_before);
  const tier = tiers.find((t) => days >= (Number(t.min_days_before) || 0)) || tiers[tiers.length - 1];
  const pct = Number(tier?.penalty_percentage) || 0;
  return { percentage: pct, amount: round2((base * pct) / 100) };
}

const STEP_LABEL = { penalty: 'Keep cancellation fee from the deposit', additional: 'Collect the unpaid part of the fee', refund: 'Refund the remaining deposit' };
const brief = (p) => ({ id: p.id, payment_type: p.payment_type, amount: p.amount, status: p.status, payment_method: p.payment_method, settlement: isSettlement(p) });

export async function cancellationPlan(svc, event) {
  const [policies, quotes, payments] = await Promise.all([
    svc.entities.CateringCancellationPolicy.list(),
    svc.entities.CateringQuote.filter({ event_id: event.id }),
    svc.entities.CateringPayment.filter({ event_id: event.id }),
  ]);
  const usable = policies.filter((p) => p.is_active !== false);
  const policy = usable.find((p) => p.id === event.cancellation_policy_id) || usable.find((p) => p.is_default) || usable[0] || null;
  // With no live quote, the fee is based on the latest cancelled one.
  const lastCancelled = quotes.filter((q) => q.quote_cancelled).sort((a, b) => (b.revision_number || 0) - (a.revision_number || 0))[0];
  const base = Number(event.quote_total) > 0 ? Number(event.quote_total) : Number(lastCancelled?.total) || 0;
  const days = daysUntil(event.event_date);
  const fee = resolveFee(policy, days, base);
  const money = await loadEventMoney(svc, event);
  const settlement = payments.filter((p) => isSettlement(p) && p.status === 'completed');
  const kept = round2(settlement.filter((p) => p.payment_type === 'penalty').reduce((s, p) => s + (Number(p.amount) || 0), 0));
  const feeLeft = round2(Math.max(0, fee.amount - kept));
  const credit = round2(money.totalPaid);
  const pending = payments.filter((p) => p.status === 'pending');
  let next = null;
  if (feeLeft > 0) next = credit >= feeLeft ? { payment_type: 'penalty', amount: feeLeft } : { payment_type: 'additional', amount: round2(feeLeft - Math.max(0, credit)) };
  else if (credit > 0) next = { payment_type: 'refund', amount: credit };
  if (next) next.label = STEP_LABEL[next.payment_type];
  return {
    policy_id: policy?.id || '', policy_name: policy?.name || '', days, fee_base: base,
    fee_percentage: fee.percentage, fee_amount: fee.amount, fee_kept: kept, fee_left: feeLeft, credit,
    pending: pending.map(brief), settled: settlement.map(brief),
    refunded: round2(settlement.filter((p) => p.payment_type === 'refund').reduce((s, p) => s + (Number(p.amount) || 0), 0)),
    next: pending.length ? null : next, ready: !next && !pending.length,
  };
}