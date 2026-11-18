// Admin › Email saves and test emails (used by the emailSettingsAdmin backend function).
import { EMAIL_KEYS, RECIPIENT_KEYS, CLIENT_FACING_KEYS, EMAIL_INFO } from './emailSettings.js';
import { isEmailAddress } from './emailDelivery.js';

const MAX_EMPLOYEES = 50;
const MAX_ADDRESSES = 25;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const normalize = (r) => ({ include_default: r?.include_default !== false, employee_ids: r?.employee_ids || [], extra_emails: r?.extra_emails || [] });

/**
 * Validates { switches, recipients } against the saved record.
 * Returns { patch, changes, summary } or { error }. Unknown employee ids are dropped.
 */
export function buildEmailSettingsPatch(record, { switches = {}, recipients = {} } = {}, employeeIds) {
  const patch = {};
  const changes = {};
  const summary = [];
  for (const [key, on] of Object.entries(switches || {})) {
    if (!EMAIL_KEYS.includes(key) || typeof on !== 'boolean') return { error: `Unknown email switch: ${key}` };
    const before = record?.[key] !== false;
    if (before === on) continue;
    patch[key] = on;
    changes[key] = { from: before, to: on };
    summary.push(`${EMAIL_INFO[key].label} turned ${on ? 'on' : 'off'}`);
  }
  const nextRecipients = { ...(record?.recipients || {}) };
  for (const [key, value] of Object.entries(recipients || {})) {
    if (!RECIPIENT_KEYS.includes(key) || !value || typeof value !== 'object') return { error: `Unknown email: ${key}` };
    const extra = [...new Set((Array.isArray(value.extra_emails) ? value.extra_emails : []).map((e) => String(e).trim().toLowerCase()))];
    const bad = extra.find((e) => !isEmailAddress(e));
    if (bad) return { error: `"${bad}" is not a valid email address` };
    const ids = [...new Set((Array.isArray(value.employee_ids) ? value.employee_ids : []).map(String))].filter((id) => employeeIds.has(id));
    if (ids.length > MAX_EMPLOYEES || extra.length > MAX_ADDRESSES) {
      return { error: `${EMAIL_INFO[key].label}: choose up to ${MAX_EMPLOYEES} employees and ${MAX_ADDRESSES} other addresses` };
    }
    const next = { include_default: CLIENT_FACING_KEYS.includes(key) || value.include_default !== false, employee_ids: ids, extra_emails: extra };
    const before = normalize(record?.recipients?.[key]);
    if (JSON.stringify(before) === JSON.stringify(next)) continue;
    nextRecipients[key] = next;
    changes[`recipients.${key}`] = { from: before, to: next };
    summary.push(`${EMAIL_INFO[key].label} recipients changed`);
  }
  if (Object.keys(changes).some((k) => k.startsWith('recipients.'))) patch.recipients = nextRecipients;
  return { patch, changes, summary };
}

/** A short test email that names the email being tested. */
export function buildTestEmail(key, brand, toAddedPeople) {
  const { label, when } = EMAIL_INFO[key];
  const intro = toAddedPeople
    ? `You have been added to receive the "${esc(label)}" email from ${esc(brand)}. It is sent ${esc(when)}.`
    : `This is the test you asked for in Admin › Email. The "${esc(label)}" email is sent ${esc(when)}.`;
  return {
    subject: `[Test] ${label} | ${brand}`,
    body: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin:0 0 12px">Test: ${esc(label)}</h2>
      <p style="line-height:1.6">${intro}</p>
      <p style="line-height:1.6;color:#475569">This test only confirms that this address receives emails from ${esc(brand)}. No action is needed.</p>
    </div>`,
  };
}