import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { checkPermission } from '../_shared/requirePermission.js';
import { audit } from '../_shared/auditLog.js';
import { loadReceiptSettings, cleanReceiptSettings, mergeReceiptSettings, RECEIPT_DEFAULTS } from '../_shared/receiptSettings.js';
import { emailPaymentReceipt, paymentReceiptFiles, sampleReceiptFile, toBase64 } from '../_shared/receiptEmail.js';

// Catering › Settings › Client Receipt, and the receipt actions on a payment.
//   get_settings / save_settings / preview  — catering settings editors
//   download / send                         — staff who can see the payment
const SETTINGS = ['catering_settings_edit', 'catering_edit'];
const SEND = ['catering_finance', 'catering_payment_approve', 'catering_edit'];
const fail = (error: string, status = 400) => Response.json({ error }, { status });
const pdfOut = (file: { filename: string; bytes: Uint8Array }) => ({ filename: file.filename, pdf_base64: toBase64(file.bytes) });

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return fail('Unauthorized', 401);
    const body = await req.json().catch(() => ({}));
    const svc = base44.asServiceRole;
    const allowed = async (flags: string[]) => (await checkPermission(base44, user, flags)).allowed;

    if (['get_settings', 'save_settings', 'preview'].includes(body.action)) {
      if (!(await allowed(SETTINGS))) return fail('Only catering settings editors can change the client receipt.', 403);
      if (body.action === 'get_settings') {
        const { settings, record } = await loadReceiptSettings(svc);
        return Response.json({ settings, defaults: RECEIPT_DEFAULTS, updated_by: record?.updated_by || '', updated_date: record?.updated_date || '' });
      }
      if (body.action === 'preview') {
        const settings = mergeReceiptSettings(body.settings || {});
        return Response.json(pdfOut(await sampleReceiptFile(svc, { lang: body.lang, settings })));
      }
      const { record } = await loadReceiptSettings(svc);
      const payload = { ...cleanReceiptSettings(body.settings || {}), updated_by: user.email };
      const saved = record
        ? await svc.entities.CateringReceiptSettings.update(record.id, payload)
        : await svc.entities.CateringReceiptSettings.create(payload);
      audit(base44, user, record ? 'update' : 'create', 'CateringReceiptSettings', 'Saved the client receipt settings', {
        entityId: saved.id, entityName: 'Client receipt', changes: { auto_send: payload.auto_send, auto_send_types: payload.auto_send_types, language: payload.language },
      });
      return Response.json({ settings: mergeReceiptSettings(saved) });
    }

    if (body.action === 'auto_status') {
      if (!(await allowed(['catering_view', ...SEND]))) return fail('Forbidden', 403);
      const { settings } = await loadReceiptSettings(svc);
      return Response.json({ auto_send: settings.auto_send, auto_send_types: settings.auto_send_types, language: settings.language });
    }

    if (body.action === 'download' || body.action === 'send') {
      if (!body.payment_id) return fail('payment_id is required');
      // Read as the caller first, so branch and module access apply.
      const visible = await base44.entities.CateringPayment.get(body.payment_id).catch(() => null);
      if (!visible) return fail('Payment not found', 404);
      const payment = await svc.entities.CateringPayment.get(body.payment_id);
      if (payment.status !== 'completed' || payment.credit_note || !['deposit', 'final_balance', 'additional'].includes(payment.payment_type)) {
        return fail('Receipts are only available for approved client payments.', 409);
      }
      const event = await svc.entities.CateringEvent.get(payment.event_id).catch(() => null);
      if (!event) return fail('Event not found', 404);
      const { settings } = await loadReceiptSettings(svc);
      const lang = ['en', 'ar', 'both'].includes(body.lang) ? body.lang : settings.language;
      if (body.action === 'download') {
        const { files } = await paymentReceiptFiles(svc, { event, payment, lang, settings });
        return Response.json({ files: files.map(pdfOut) });
      }
      if (!(await allowed(SEND))) return fail('You do not have permission to email client receipts.', 403);
      const result = await emailPaymentReceipt(svc, { event, payment, settings, lang, trigger: 'manual', actor: user.email });
      return Response.json(result, { status: result.status === 'sent' ? 200 : 422 });
    }

    return fail('Unknown action');
  } catch (error) {
    return fail(error?.message || 'Something went wrong', 500);
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
