/**
 * Builds client receipt PDFs and emails them to the event's client, using
 * Catering › Settings › Client Receipt. The recipient is always the client's
 * email on record (client record, else their portal sign-in), never one the
 * caller supplies. Each send is logged in Admin › Email › Recent activity and
 * its outcome saved on the payment.
 */
import { loadReceiptSettings, fillReceiptTemplate, autoCovers } from './receiptSettings.js';
import { buildReceiptData, sampleReceiptData, loadBrand, receiptVars } from './receiptData.js';
import { renderReceiptPdf } from './receiptPdf.js';
import { loadArabicFonts } from './pdfBidi.js';
import { sendAndLog } from './emailDelivery.js';
import { getCompanyOffset } from './companyTimezone.js';
import { clientEmailFor } from './cateringEmailRecipients.js';

export const RECEIPT_EMAIL_KEY = 'catering_payment_receipt';
export const NO_CLIENT_EMAIL = 'The client has no email address. Add one to the client record or invite them to the portal.';
export const languagesOf = (lang) => (lang === 'both' ? ['en', 'ar'] : [lang === 'ar' ? 'ar' : 'en']);

export function toBase64(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}

async function fetchBytes(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

async function renderFiles({ settings, langs, dataFor, brand }) {
  const [fonts, logoBytes] = await Promise.all([loadArabicFonts(), settings.show_logo ? fetchBytes(brand.logoUrl) : null]);
  return Promise.all(langs.map(async (lang) => {
    const data = dataFor(lang);
    const bytes = await renderReceiptPdf({ lang, data, settings, brand, logoBytes, fonts });
    return { lang, data, bytes, filename: `Receipt_${data.number}${lang === 'ar' ? '_AR' : ''}.pdf` };
  }));
}

export async function paymentReceiptFiles(svc, { event, payment, lang, settings }) {
  const [brand, data] = await Promise.all([loadBrand(svc), buildReceiptData(svc, { event, payment })]);
  const files = await renderFiles({ settings, langs: languagesOf(lang), dataFor: () => data, brand });
  return { files, data, brand };
}

export async function sampleReceiptFile(svc, { lang, settings }) {
  const [brand, offset] = await Promise.all([loadBrand(svc), getCompanyOffset(svc.entities)]);
  const [file] = await renderFiles({ settings, langs: [lang === 'ar' ? 'ar' : 'en'], dataFor: (l) => sampleReceiptData(l, offset), brand });
  return file;
}

async function recordOutcome(svc, payment, { status, to = '', error = '', trigger, actor = '' }) {
  await svc.entities.CateringPayment.update(payment.id, {
    receipt_email_status: status,
    receipt_email_trigger: trigger,
    receipt_email_to: to,
    receipt_email_at: new Date().toISOString(),
    receipt_email_by: actor,
    receipt_email_error: String(error || '').slice(0, 300),
    receipt_email_count: (Number(payment.receipt_email_count) || 0) + (status === 'sent' ? 1 : 0),
  }).catch((e) => console.error('Receipt email outcome not saved', e?.message));
  return { status, to, error };
}

/** Emails the receipt; never throws. Returns { status: 'sent' | 'failed', to, error }. */
export async function emailPaymentReceipt(svc, { event, payment, settings, lang, trigger, actor = '' }) {
  const outcome = (o) => recordOutcome(svc, payment, { ...o, trigger, actor });
  try {
    const to = await clientEmailFor(svc, event);
    if (!to) return outcome({ status: 'failed', error: NO_CLIENT_EMAIL });
    const chosen = lang || settings.language;
    const { files, data, brand } = await paymentReceiptFiles(svc, { event, payment, lang: chosen, settings });
    const langs = languagesOf(chosen);
    const fill = (key, l) => fillReceiptTemplate(settings[`${key}_${l}`], receiptVars(data, l, brand.name)).trim();
    const result = await sendAndLog(svc, {
      key: RECEIPT_EMAIL_KEY,
      to: [to],
      subject: fill('email_subject', langs[0]),
      text: langs.map((l) => fill('email_body', l)).join('\n\n----------\n\n'),
      from_name: settings.from_name?.trim() || brand.name || undefined,
      attachments: files.map((f) => ({ filename: f.filename, content: toBase64(f.bytes) })),
      category: 'transactional',
      context: event.event_name,
      context_id: event.id,
      triggered_by: actor,
    });
    if (result.sent.length) return outcome({ status: 'sent', to });
    return outcome({ status: 'failed', to, error: result.failures[0]?.error || 'Not delivered' });
  } catch (error) {
    return outcome({ status: 'failed', error: error?.message || 'The receipt could not be emailed' });
  }
}

/** After Finance approves a payment: emails the receipt when the settings say so. Never throws. */
export async function autoEmailReceipt(svc, { event, payment }) {
  try {
    const { settings } = await loadReceiptSettings(svc);
    if (payment.credit_note || payment.status !== 'completed' || !autoCovers(settings, payment.payment_type)) return { status: 'skipped' };
    return await emailPaymentReceipt(svc, { event, payment, settings, trigger: 'auto' });
  } catch (error) {
    return { status: 'failed', error: error?.message || 'The receipt could not be emailed' };
  }
}