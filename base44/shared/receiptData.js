/**
 * What a client receipt shows, read from live records: the business (Admin ›
 * Branding), the client, the event, this payment, and the payments completed
 * up to and including it, so a receipt never shows money paid after it.
 */
import { loadEventMoney, isOutgoing, round2 } from './cateringPaymentPosting.js';
import { getCompanyOffset } from './companyTimezone.js';
import { money, formatWhen, typeLabel } from './receiptLabels.js';

export const receiptNumber = (paymentId) => `RCT-${String(paymentId || '').slice(-8).toUpperCase()}`;

const methodOf = (p) => p.payment_account_snapshot?.method_name || String(p.payment_method || '').replace(/_/g, ' ');
const paidAt = (p) => p.payment_date || p.approved_date || p.created_date;
const row = (p) => ({
  id: p.id, type: p.payment_type, method: methodOf(p), reference: p.reference || '', paidAt: paidAt(p),
  amount: round2((isOutgoing(p.payment_type) ? -1 : 1) * (Number(p.amount) || 0)),
});

export async function loadBrand(svc) {
  const [info = {}] = await svc.entities.RestaurantInfo.list();
  const phones = [info.phone, info.landline, info.hotline].filter(Boolean).join('  ·  ');
  const web = String(info.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  return {
    name: info.brand_name || '',
    color: info.primary_color || '',
    logoUrl: info.logo_url || '',
    contact: [info.address, phones, [info.email, web].filter(Boolean).join('  ·  ')].filter(Boolean),
  };
}

export async function buildReceiptData(svc, { event, payment }) {
  const [totals, payments, client, offset] = await Promise.all([
    loadEventMoney(svc, event),
    svc.entities.CateringPayment.filter({ event_id: event.id }),
    event.client_id ? svc.entities.Client.get(event.client_id).catch(() => null) : Promise.resolve(null),
    getCompanyOffset(svc.entities),
  ]);
  const time = (p) => new Date(paidAt(p)).getTime() || 0;
  const done = payments
    .filter((p) => p.status === 'completed')
    .sort((a, b) => time(a) - time(b) || String(a.created_date).localeCompare(String(b.created_date)));
  const upTo = done.findIndex((p) => p.id === payment.id);
  const history = (upTo >= 0 ? done.slice(0, upTo + 1) : done).map((p) => ({ ...row(p), current: p.id === payment.id }));
  const totalPaid = round2(history.reduce((sum, h) => sum + h.amount, 0));
  const offSite = event.location_type === 'off_site';
  return {
    number: receiptNumber(payment.id),
    issuedAt: payment.approved_date || new Date().toISOString(),
    offset,
    sample: false,
    client: { name: event.client_name || client?.name || '', phone: client?.phone || event.client_phone || '', email: client?.email || '' },
    event: {
      name: event.event_name || '', date: event.event_date || '', time: event.start_time || '',
      venue: offSite ? [event.venue_name, event.venue_address].filter(Boolean).join(', ') : event.branch_name || '',
      onSite: !offSite,
      guests: Number(event.guarantee_locked ? event.guaranteed_guests : event.expected_guests) || 0,
    },
    payment: { ...row(payment), approvedAt: payment.approved_date || '' },
    totals: { eventTotal: totals.grandTotal, totalPaid, remaining: round2(totals.grandTotal - totalPaid) },
    history,
  };
}

/** Made-up figures for the settings preview: never a real client's data. */
export function sampleReceiptData(lang, offset) {
  const ar = lang === 'ar';
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const history = [
    { id: 's1', type: 'deposit', amount: 60000, method: ar ? 'تحويل بنكي' : 'Bank transfer', reference: 'TRX-20418', paidAt: daysAgo(21), current: false },
    { id: 's2', type: 'additional', amount: 30000, method: ar ? 'نقدي' : 'Cash', reference: '', paidAt: daysAgo(0), current: true },
  ];
  return {
    number: 'RCT-SAMPLE01', issuedAt: daysAgo(0), offset, sample: true,
    client: { name: ar ? 'عميل تجريبي' : 'Sample Client', phone: '+20 100 000 0000', email: 'client@example.com' },
    event: { name: ar ? 'حفل زفاف' : 'Wedding reception', date: daysAgo(-30).slice(0, 10), time: '19:00', venue: ar ? 'قاعة الحديقة، القاهرة' : 'Garden Hall, Cairo', onSite: false, guests: 250 },
    payment: { ...history[1], approvedAt: daysAgo(0) },
    totals: { eventTotal: 150000, totalPaid: 90000, remaining: 60000 },
    history,
  };
}

/** Values for the {{placeholders}} in the email and the receipt texts. */
export function receiptVars(data, lang, brandName) {
  return {
    client_name: data.client.name,
    event_name: data.event.name,
    event_date: formatWhen(data.event.date, lang, data.offset, false),
    amount: money(Math.abs(data.payment.amount)),
    payment_type: typeLabel(data.payment.type, lang),
    payment_method: data.payment.method,
    payment_date: formatWhen(data.payment.paidAt, lang, data.offset),
    reference: data.payment.reference || '-',
    receipt_number: data.number,
    event_total: money(data.totals.eventTotal),
    total_paid: money(data.totals.totalPaid),
    remaining: money(Math.max(0, data.totals.remaining)),
    brand_name: brandName || '',
  };
}