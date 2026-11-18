// One customer's receivables statement from their catering records. An event
// counts when it has an accepted (or staff-cancelled) quote and at least one
// completed incoming payment (deposit, final or additional). Payments are
// grouped by event, so a payment on an older revision is never counted twice.
// Debit: the accepted quote total (a cancelled quote charges nothing, so what
// was paid shows as customer credit). A cancelled event is charged only its
// cancellation fee (penalties kept). Credit: completed payments net of refunds
// and deposit withdrawals.
const INCOMING = ['deposit', 'final_balance', 'additional'];
const LABEL = { deposit: 'Deposit', final_balance: 'Final payment', additional: 'Additional payment', refund: 'Refund', deposit_withdrawal: 'Deposit withdrawal', penalty: 'Cancellation penalty kept' };
export const r2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
const day = (v) => (v ? String(v).slice(0, 10) : null);

function pickQuote(quotes, event, payments) {
  const accepted = quotes.filter((q) => q.status === 'accepted');
  return accepted.find((q) => q.id === event.active_quote_id)
    || accepted.find((q) => payments.some((p) => p.quote_id === q.id))
    || accepted.sort((a, b) => (b.revision_number || 0) - (a.revision_number || 0))[0];
}

const lastCancelled = (quotes) => quotes.filter((q) => q.quote_cancelled).sort((a, b) => (b.revision_number || 0) - (a.revision_number || 0))[0];

function eventEntries(event, quote, cancelledQuote, payments, finalInvoice) {
  const entries = [];
  const quoteDebit = quote ? r2(quote.total) : 0;
  if (quote) entries.push({ date: day(quote.customer_decision_date || quote.created_date), kind: 'quote', label: `Quotation${quote.revision_number ? ` rev. ${quote.revision_number}` : ''}`, debit: quoteDebit, credit: 0 });
  else entries.push({ date: day(cancelledQuote.cancelled_date || cancelledQuote.updated_date), kind: 'quote', label: `Quotation rev. ${cancelledQuote.revision_number || 1} cancelled: amount paid held as customer credit`, debit: 0, credit: 0 });
  // A finalized reconciliation is the final invoice the ledger records as revenue:
  // the statement charges the same amount (extra guests or charges included).
  const adjustment = quote && finalInvoice && event.status !== 'cancelled' ? r2((Number(finalInvoice.final_billing_total) || 0) - quoteDebit) : 0;
  if (adjustment) entries.push({ date: day(finalInvoice.finalized_date), kind: 'invoice', label: 'Final invoice adjustment (guests and extra charges)', debit: adjustment, credit: 0 });
  const cancelled = event.status === 'cancelled';
  let credit = 0, fees = 0;
  for (const p of payments) {
    const amount = Number(p.amount) || 0;
    const date = day(p.payment_date || p.created_date);
    if (cancelled && p.payment_type === 'penalty') {
      fees += amount;
      entries.push({ date, kind: 'cancellation', label: 'Cancellation fee', reference: p.reference || '', method: p.payment_method || '', debit: r2(amount), credit: 0 });
      continue;
    }
    const signed = INCOMING.includes(p.payment_type) ? amount : -amount;
    credit += signed;
    entries.push({ date, kind: signed >= 0 ? 'payment' : 'refund', label: `${LABEL[p.payment_type] || p.payment_type}${p.credit_note ? ' (credit note)' : ''}`, reference: p.reference || '', method: p.payment_method || '', debit: 0, credit: r2(signed) });
  }
  credit = r2(credit);
  let debit = r2(quoteDebit + adjustment);
  if (cancelled) {
    if (quoteDebit) entries.push({ date: day(event.cancelled_date || event.updated_date), kind: 'cancellation', label: 'Event cancelled: quotation charge reversed', debit: -quoteDebit, credit: 0 });
    debit = r2(fees);
  }
  entries.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  return { entries, debit, credit };
}

export function buildCustomerAccount(client, { quotes, payments, events, reconciliations = [] }) {
  const done = payments.filter((p) => p.status === 'completed');
  const finalOf = new Map(reconciliations.filter((r) => r.status === 'finalized').map((r) => [r.event_id, r]));
  const byEvent = new Map();
  for (const p of done) byEvent.set(p.event_id, [...(byEvent.get(p.event_id) || []), p]);
  const eventById = new Map(events.map((e) => [e.id, e]));
  const rows = [];
  for (const [eventId, list] of byEvent) {
    if (!list.some((p) => INCOMING.includes(p.payment_type) && Number(p.amount) > 0)) continue;
    const event = eventById.get(eventId) || { id: eventId };
    const eventQuotes = quotes.filter((q) => q.event_id === eventId);
    const quote = pickQuote(eventQuotes, event, list);
    const cancelledQuote = quote ? null : lastCancelled(eventQuotes);
    if (!quote && !cancelledQuote) continue;
    const { entries, debit, credit } = eventEntries(event, quote, cancelledQuote, list, finalOf.get(eventId));
    const shown = quote || cancelledQuote;
    rows.push({
      event_id: eventId, event_name: event.event_name || list[0].event_name || 'Event', event_code: event.event_code || '',
      event_date: day(event.event_date), event_status: event.status || '', branch_id: event.branch_id || list[0].branch_id || '',
      branch_name: event.branch_name || list[0].branch_name || '', quote_id: shown.id, quote_date: day(shown.customer_decision_date || shown.created_date),
      quote_total: quote ? r2(quote.total) : 0, debit, credit, balance: r2(debit - credit), entries,
    });
  }
  if (!rows.length) return null;
  rows.sort((a, b) => String(a.quote_date || '').localeCompare(String(b.quote_date || '')));
  const total_quoted = r2(rows.reduce((s, e) => s + e.debit, 0)), total_paid = r2(rows.reduce((s, e) => s + e.credit, 0));
  const dates = rows.flatMap((e) => e.entries.map((x) => x.date)).filter(Boolean).sort();
  const name = client?.name || done[0]?.client_name || 'Unnamed customer';
  return {
    client_id: client?.id || done[0].client_id, client_name: name, client_phone: client?.phone || '', client_email: client?.email || '',
    search_text: [name, client?.phone, client?.email].filter(Boolean).join(' ').toLowerCase(),
    branch_ids: [...new Set(rows.map((e) => e.branch_id).filter(Boolean))], event_count: rows.length,
    total_quoted, total_paid, balance: r2(total_quoted - total_paid), first_quote_date: rows[0].quote_date || null,
    last_activity_date: dates[dates.length - 1] || null, events: rows,
  };
}

// The account as seen through the report's filters: only events of the allowed
// branches, and only entries dated inside from..to (either may be empty).
export function scopeAccount(account, { branchIds, from, to }) {
  const inRange = (d) => (!from || (d && d >= from)) && (!to || (d && d <= to));
  const events = (account.events || []).filter((e) => !branchIds || branchIds.includes(e.branch_id)).map((e) => {
    const entries = e.entries.filter((x) => inRange(x.date));
    const debit = r2(entries.reduce((s, x) => s + x.debit, 0)), credit = r2(entries.reduce((s, x) => s + x.credit, 0));
    return { ...e, entries, debit, credit, balance: r2(debit - credit) };
  }).filter((e) => e.entries.length);
  const debit = r2(events.reduce((s, e) => s + e.debit, 0)), credit = r2(events.reduce((s, e) => s + e.credit, 0));
  return { ...account, events, event_count: events.length, total_quoted: debit, total_paid: credit, balance: r2(debit - credit) };
}