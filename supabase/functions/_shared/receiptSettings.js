/**
 * Catering › Settings › Client Receipt: the PDF receipt a client gets for a
 * payment and the email it is sent with. One CateringReceiptSettings record,
 * read and written only through the cateringReceipt backend function; a field
 * never saved uses the default below.
 */
export const RECEIPT_TYPES = ['deposit', 'final_balance', 'additional'];
export const RECEIPT_LANGUAGES = ['en', 'ar', 'both'];
export const RECEIPT_PLACEHOLDERS = [
  'client_name', 'event_name', 'event_date', 'amount', 'payment_type', 'payment_method', 'payment_date',
  'reference', 'receipt_number', 'event_total', 'total_paid', 'remaining', 'brand_name',
];

export const RECEIPT_DEFAULTS = {
  auto_send: false,
  auto_send_types: RECEIPT_TYPES,
  language: 'en',
  from_name: '',
  email_subject_en: 'Payment receipt {{receipt_number}} - {{event_name}}',
  email_body_en: 'Dear {{client_name}},\n\nThank you. We have received your payment of {{amount}} ({{payment_type}}) for {{event_name}} on {{event_date}}.\n\nEvent total: {{event_total}}\nTotal paid: {{total_paid}}\nRemaining balance: {{remaining}}\n\nYour receipt is attached as a PDF.\n\nKind regards,\n{{brand_name}}',
  email_subject_ar: 'إيصال استلام دفعة {{receipt_number}} - {{event_name}}',
  email_body_ar: 'عزيزنا {{client_name}}،\n\nشكرًا لكم. استلمنا دفعتكم بقيمة {{amount}} ({{payment_type}}) لمناسبة {{event_name}} بتاريخ {{event_date}}.\n\nإجمالي المناسبة: {{event_total}}\nإجمالي المدفوع: {{total_paid}}\nالمبلغ المتبقي: {{remaining}}\n\nتجدون الإيصال مرفقًا بصيغة PDF.\n\nمع أطيب التحيات،\n{{brand_name}}',
  pdf_title_en: 'PAYMENT RECEIPT',
  pdf_title_ar: 'إيصال استلام دفعة',
  logo_position: 'left',
  show_logo: true,
  show_brand_name: true,
  show_business_contact: true,
  accent_color: '',
  header_details_en: '',
  header_details_ar: '',
  show_client_contact: true,
  show_event_details: true,
  show_payment_details: true,
  show_approval: true,
  show_balance_summary: true,
  show_payment_history: true,
  show_signature: false,
  signature_label_en: 'Authorised signature',
  signature_label_ar: 'التوقيع المعتمد',
  notes_en: 'Thank you for your payment.',
  notes_ar: 'شكرًا لكم على سداد الدفعة.',
  footer_en: 'This receipt confirms the payment shown above.',
  footer_ar: 'يؤكد هذا الإيصال استلام الدفعة الموضحة أعلاه.',
};

const MAX_LENGTH = { email_body_en: 4000, email_body_ar: 4000, notes_en: 1000, notes_ar: 1000, header_details_en: 1000, header_details_ar: 1000, footer_en: 1000, footer_ar: 1000 };
// Left empty, these fall back to the default text; other texts may stay empty.
const REQUIRED_TEXT = ['email_subject_en', 'email_body_en', 'email_subject_ar', 'email_body_ar', 'pdf_title_en', 'pdf_title_ar', 'signature_label_en', 'signature_label_ar'];

/** Only known fields, in their expected shape; anything else is dropped. */
export function cleanReceiptSettings(input = {}) {
  const out = {};
  for (const [key, fallback] of Object.entries(RECEIPT_DEFAULTS)) {
    const value = input?.[key];
    if (value === undefined || value === null) continue;
    if (typeof fallback === 'boolean') out[key] = value === true;
    else if (key === 'auto_send_types') { if (Array.isArray(value)) out[key] = RECEIPT_TYPES.filter((t) => value.includes(t)); }
    else if (key === 'language') { if (RECEIPT_LANGUAGES.includes(value)) out[key] = value; }
    else if (key === 'logo_position') { if (value === 'left' || value === 'right') out[key] = value; }
    else if (key === 'accent_color') out[key] = /^#[0-9a-f]{6}$/i.test(String(value).trim()) ? String(value).trim() : '';
    else out[key] = String(value).slice(0, MAX_LENGTH[key] || 300);
  }
  return out;
}

export function mergeReceiptSettings(saved = {}) {
  const merged = { ...RECEIPT_DEFAULTS, ...cleanReceiptSettings(saved) };
  for (const key of REQUIRED_TEXT) if (!String(merged[key] || '').trim()) merged[key] = RECEIPT_DEFAULTS[key];
  return merged;
}

export async function loadReceiptSettings(svc) {
  const [record] = await svc.entities.CateringReceiptSettings.list('-updated_date', 1);
  return { record: record || null, settings: mergeReceiptSettings(record || {}) };
}

/** Whether approving a payment of this type emails its receipt by itself. */
export const autoCovers = (settings, type) => settings.auto_send === true && settings.auto_send_types.includes(type);

export async function receiptAutoCovers(svc, type) {
  try {
    return autoCovers((await loadReceiptSettings(svc)).settings, type);
  } catch {
    return false;
  }
}

/** Replaces {{placeholders}}; an unknown placeholder stays as typed. */
export const fillReceiptTemplate = (text, vars) =>
  String(text || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key) => (key in vars ? String(vars[key] ?? '') : match));