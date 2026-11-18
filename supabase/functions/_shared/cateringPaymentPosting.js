/**
 * Server-side catering payment posting shared by recordCateringPayment and
 * issueCateringCreditNote. The caller's permission is checked here with the
 * user client; every write then runs with the service role so the finance
 * position does not also need catering_edit on the event.
 *
 * The platform has no multi-record transactions, so writes run in order and a
 * failure rolls back what was already written (journal entries and payment
 * deleted, event fields restored to their prior values).
 */
import { getEffectivePermissions } from './resolveEffectivePermissions.js';
import { isCentralAdmin } from './platformRole.js';
import { configuredPaymentJournal } from './configuredPaymentJournal.js';

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Money taken off what the client has paid: refunds/credit notes, excess-deposit
 * withdrawals, and cancellation penalties, which are kept from the deposit (no
 * cash moves; the books move them from customer deposits to cancellation income).
 */
export const isOutgoing = (type) => type === 'refund' || type === 'deposit_withdrawal' || type === 'penalty';



/** catering_finance + branch check (central admins skip the branch check). Returns { user, permissions, event } or { error, status }. */
export async function authorizeFinanceOnEvent(base44, eventId) {
  const user = await base44.auth.me();
  if (!user) return { error: 'Unauthorized', status: 401 };
  if (!eventId) return { error: 'event_id is required', status: 400 };
  const permissions = await getEffectivePermissions(base44, user);
  const central = isCentralAdmin(user, permissions);
  if (!central && (!permissions || permissions.access_denied || permissions.catering_finance !== true))
    return { error: 'Forbidden: requires catering_finance', status: 403 };
  const event = await base44.asServiceRole.entities.CateringEvent.get(eventId).catch(() => null);
  if (!event) return { error: 'Event not found', status: 404 };
  if (!central && permissions.branch_id && permissions.branch_id !== event.branch_id)
    return { error: "Forbidden: this event belongs to another branch", status: 403 };
  return { user, permissions, event, central };
}

/**
 * Event money position read fresh from the database: food quote + live
 * staffing (non-released assignments) + logistics (non-cancelled trips), and
 * the net amount paid from completed payments. Same rules as the screen.
 */
export async function loadEventMoney(svc, event) {
  const [assignments, trips, payments] = await Promise.all([
    svc.entities.CateringAssignment.filter({ event_id: event.id }),
    svc.entities.CateringTrip.filter({ event_id: event.id }),
    svc.entities.CateringPayment.filter({ event_id: event.id }),
  ]);
  const staffing = assignments.filter((a) => a.status !== 'released').reduce((s, a) => s + (Number(a.estimated_cost) || 0), 0);
  const logistics = trips.filter((t) => t.stage !== 'cancelled').reduce((s, t) => s + (Number(t.estimated_transport_cost) || 0), 0);
  const grandTotal = round2((Number(event.quote_total) || 0) + staffing + logistics);
  const done = payments.filter((p) => p.status === 'completed');
  const sum = (fn) => round2(done.filter(fn).reduce((s, p) => s + (Number(p.amount) || 0), 0));
  // Refunds, withdrawals and penalties all come off what was paid, the deposit first.
  const taken = sum((p) => isOutgoing(p.payment_type));
  const totalPaid = round2(sum((p) => !isOutgoing(p.payment_type)) - taken);
  const depositPaid = Math.max(0, round2(sum((p) => p.payment_type === 'deposit') - taken));
  return { grandTotal, totalPaid, depositPaid, remaining: round2(Math.max(0, grandTotal - totalPaid)) };
}

export const fmtEGP = (n) => `${round2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;

export async function postPaymentToLedger(svc, payment, event) {
  if (!payment.payment_method_id || !payment.payment_account_snapshot) throw new Error('Configure and select a payment method before posting this payment.');
  return configuredPaymentJournal(svc, payment, event);
}

/**
 * Runs the steps with a rollback log. Each step may call track.payment(id),
 * track.journal(id) or track.event(before) so a failure can undo it.
 */
export async function runWithRollback(svc, eventId, steps) {
  const created = { payments: [], journals: [], eventBefore: null, undos: [] };
  const track = {
    undo: (fn) => created.undos.push(fn),
    payment: (id) => created.payments.push(id),
    journal: (id) => id && created.journals.push(id),
    event: (before) => { if (!created.eventBefore) created.eventBefore = before; },
  };
  try {
    return await steps(track);
  } catch (error) {
    const rollbackErrors = [];
    for (const id of created.journals) await svc.entities.JournalEntry.delete(id).catch((e) => rollbackErrors.push(`journal ${id}: ${e.message}`));
    for (const id of created.payments) await svc.entities.CateringPayment.delete(id).catch((e) => rollbackErrors.push(`payment ${id}: ${e.message}`));
    for (const fn of created.undos.reverse()) await fn().catch((e) => rollbackErrors.push(`undo: ${e.message}`));
    if (created.eventBefore) await svc.entities.CateringEvent.update(eventId, created.eventBefore).catch((e) => rollbackErrors.push(`event: ${e.message}`));
    if (rollbackErrors.length) console.error('Rollback incomplete', rollbackErrors);
    const err = new Error(`${error.message}${rollbackErrors.length ? ' (rollback incomplete — check logs)' : ' — nothing was saved'}`);
    err.rollbackFailed = rollbackErrors.length > 0;
    throw err;
  }
}

export const EVENT_MONEY_FIELDS = [
  'total_paid', 'deposit_paid_amount', 'balance_due', 'deposit_status', 'status',
  'reservation_status', 'reservation_requested_by', 'reservation_requested_date', 'reservation_rejection_reason',
];

export const snapshot = (event, fields = EVENT_MONEY_FIELDS) =>
  Object.fromEntries(fields.map((f) => [f, event[f] ?? null]));