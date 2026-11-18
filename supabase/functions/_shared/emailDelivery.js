/**
 * Admin › Email delivery: who receives each automatic email (its usual
 * recipients unless turned off, plus chosen employees and added addresses),
 * and the send log behind Admin › Email › Recent activity.
 */
import { CLIENT_FACING_KEYS } from './emailSettings.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmailAddress = (value) => EMAIL_RE.test(String(value || '').trim());
export const uniqueEmails = (list) =>
  [...new Set((list || []).filter(isEmailAddress).map((email) => String(email).trim().toLowerCase()))];

/** Reads Admin › Email once: switches and recipient choices. */
export async function loadEmailConfig(svc) {
  const [record] = await svc.entities.EmailNotificationSettings.filter({ setting_key: 'email_notifications' });
  const settings = record || {};
  let staff = null;
  const employees = () => (staff ||= svc.entities.Employee.list('name', 1000));
  const choice = (key) => settings.recipients?.[key] || {};
  const includesDefault = (key) => CLIENT_FACING_KEYS.includes(key) || choice(key).include_default !== false;
  return {
    on: (key) => settings[key] !== false,
    includesDefault,
    employees,
    /** The usual recipients (unless turned off) + chosen active employees + added addresses, deduped. */
    async recipientsFor(key, usual = []) {
      const { employee_ids: ids = [], extra_emails: extra = [] } = choice(key);
      const chosen = ids.length
        ? (await employees()).filter((e) => ids.includes(e.id) && e.status === 'active').map((e) => e.email)
        : [];
      return uniqueEmails([...(includesDefault(key) ? usual : []), ...chosen, ...extra]);
    },
  };
}

const failureText = (result) => {
  if (result.status === 'fulfilled') return result.value?.message || result.value?.reason || 'Not delivered';
  const data = result.reason?.response?.data;
  const text = typeof data?.detail === 'string' ? data.detail : typeof data?.error === 'string' ? data.error : result.reason?.message;
  return String(text || 'Send failed').slice(0, 300);
};

/** Sends the same email to each address and records the send. Never throws. */
export async function sendAndLog(svc, { key, to, subject, text, body, html, from_name, attachments, category, context = '', context_id = '', is_test = false, triggered_by = '' }) {
  const recipients = uniqueEmails(to);
  const content = Object.fromEntries(Object.entries({ subject, text, body, html, from_name, attachments, category }).filter(([, value]) => value));
  const results = await Promise.allSettled(recipients.map((email) => svc.integrations.Core.SendEmail({ to: email, ...content })));
  const sent = [];
  const failures = [];
  results.forEach((result, i) => {
    // A blocked address (unsubscribed, bounced) resolves with success: false instead of throwing.
    if (result.status === 'fulfilled' && result.value?.success !== false) sent.push(recipients[i]);
    else failures.push({ email: recipients[i], error: failureText(result) });
  });
  const status = !recipients.length ? 'no_recipients' : !failures.length ? 'sent' : sent.length ? 'partial' : 'failed';
  await svc.entities.EmailSendLog.create({
    email_key: key, subject: subject || '', context: String(context || '').slice(0, 300), context_id: String(context_id || ''),
    recipients, recipient_count: recipients.length, sent_count: sent.length, failed_count: failures.length,
    failures, status, is_test, triggered_by,
  }).catch((e) => console.error('Email log failed', e?.message));
  return { sent, failures, recipients };
}