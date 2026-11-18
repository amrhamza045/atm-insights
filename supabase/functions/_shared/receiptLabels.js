/** Fixed wording on the client receipt, in both languages, plus money and dates. */
export const RECEIPT_LABELS = {
  en: {
    receiptNo: 'Receipt no.', date: 'Date', receivedFrom: 'Received from', event: 'Event', onSite: 'At our venue',
    guests: (n) => `${n} guests`, amountReceived: 'Amount received', paymentFor: 'Payment for', method: 'Method',
    reference: 'Reference', paymentDate: 'Payment date', approvedOn: 'Approved on', eventTotal: 'Event total',
    totalPaid: 'Total paid', remaining: 'Remaining balance', credit: 'Credit in your favour', history: 'Payment history',
    payment: 'Payment', amount: 'Amount', page: (a, b) => `Page ${a} of ${b}`, sample: 'SAMPLE',
    types: { deposit: 'Deposit', final_balance: 'Final balance', additional: 'Additional payment', refund: 'Refund', penalty: 'Cancellation penalty', deposit_withdrawal: 'Deposit withdrawal' },
  },
  ar: {
    receiptNo: 'رقم الإيصال', date: 'التاريخ', receivedFrom: 'استلمنا من', event: 'المناسبة', onSite: 'في مقرنا',
    guests: (n) => `${n} ضيف`, amountReceived: 'المبلغ المستلم', paymentFor: 'نوع الدفعة', method: 'طريقة الدفع',
    reference: 'المرجع', paymentDate: 'تاريخ الدفع', approvedOn: 'تاريخ الاعتماد', eventTotal: 'إجمالي المناسبة',
    totalPaid: 'إجمالي المدفوع', remaining: 'المبلغ المتبقي', credit: 'رصيد لصالحكم', history: 'سجل المدفوعات',
    payment: 'الدفعة', amount: 'المبلغ', page: (a, b) => `صفحة ${a} من ${b}`, sample: 'نموذج',
    types: { deposit: 'دفعة مقدمة', final_balance: 'الدفعة النهائية', additional: 'دفعة إضافية', refund: 'استرداد', penalty: 'غرامة إلغاء', deposit_withdrawal: 'سحب من العربون' },
  },
};

export const typeLabel = (type, lang) => RECEIPT_LABELS[lang]?.types[type] || String(type || '').replace(/_/g, ' ');

export const money = (n) =>
  `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A day ("2026-11-05") or a moment, in the company timezone (minutes from UTC,
 * Admin › Settings › Timezone). Without a timezone, moments show the day only.
 */
export function formatWhen(value, lang, offset, withTime = true) {
  if (!value) return '-';
  const dayOnly = DAY_ONLY.test(String(value));
  const date = dayOnly ? new Date(`${value}T00:00:00Z`) : new Date(new Date(value).getTime() + (offset ?? 0) * 60000);
  if (Number.isNaN(date.getTime())) return String(value);
  const time = withTime && !dayOnly && offset !== null && offset !== undefined ? { hour: 'numeric', minute: '2-digit' } : {};
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric', ...time }).format(date);
}