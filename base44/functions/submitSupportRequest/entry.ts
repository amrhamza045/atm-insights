import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Help › Support: emails a signed-in user's issue report to the support address
// set in Admin › Business Setup › Vendor / Support info. The recipient is never
// taken from the request and never returned to the browser.
const CATEGORIES = {
  booking: 'Booking or event',
  payment: 'Payment or receipt',
  account: 'Account or login',
  app: 'App problem or error',
  other: 'Something else',
};
const PRIORITIES = { normal: 'Normal', urgent: 'Urgent' };
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Please sign in to contact support.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const category = CATEGORIES[body.category];
  const priority = PRIORITIES[body.priority] || PRIORITIES.normal;
  const subject = str(body.subject, 150);
  const description = str(body.description, 4000);
  const phone = str(body.phone, 40);
  const page = str(body.page, 200);
  if (!category || !subject || description.length < 10) {
    return Response.json({ error: 'Choose a topic, add a subject and describe the issue (at least 10 characters).' }, { status: 400 });
  }

  const [rec] = await base44.asServiceRole.entities.VendorSupportInfo.filter({ setting_key: 'vendor_support' });
  const to = String(rec?.support_email || '').trim();
  if (!to) {
    return Response.json({ error: 'Support email is not set up yet. Please ask the administrator to add it in Admin › Business Setup › Vendor / Support info.', code: 'no_support_email' }, { status: 409 });
  }

  const row = (label, value) => value ? `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top">${label}</td><td style="padding:6px 0">${esc(value)}</td></tr>` : '';
  const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;font-size:14px">
<h2 style="margin:0 0 12px">New support request</h2>
<table style="border-collapse:collapse">${row('Topic', category)}${row('Priority', priority)}${row('Subject', subject)}
${row('From', user.full_name || '')}${row('Email', user.email)}${row('Phone', phone)}${row('Screen', page)}</table>
<h3 style="margin:16px 0 6px">Description</h3>
<div style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px">${esc(description)}</div>
<p style="color:#64748b;font-size:12px;margin-top:16px">Reply to the client at ${esc(user.email)}.</p></div>`;

  const result = await base44.asServiceRole.integrations.Core.SendEmail({
    to,
    subject: `[Support${priority === 'Urgent' ? ' · Urgent' : ''}] ${category}: ${subject}`,
    body: html,
    category: 'transactional',
  }).catch((e) => ({ success: false, message: e?.message }));

  if (result?.success === false) {
    console.error('Support email failed', result?.reason || result?.message);
    return Response.json({ error: 'Your message could not be delivered right now. Please try again in a few minutes.' }, { status: 502 });
  }
  return Response.json({ ok: true });
}