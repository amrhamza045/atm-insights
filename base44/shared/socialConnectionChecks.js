// Live checks behind "Check connection" in Admin › Systems › Social Media.
// Each check returns { status: 'connected' | 'not_connected' | 'error', message, account? }.
import { graphGet, graphPost } from './metaGraph.js';

const META = ['META_APP_SECRET', 'META_VERIFY_TOKEN', 'META_PAGE_ACCESS_TOKEN'];
const FORWARDED = ['SOCIAL_LEADS_WEBHOOK_SECRET'];

/** Secrets each platform needs (names only; values never leave the server). */
export const PLATFORM_SECRETS = {
  facebook: META,
  instagram: META,
  whatsapp: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_NUMBER'],
  tiktok: FORWARDED,
  linkedin: FORWARDED,
};

// The ID typed on the card must be the account the token really belongs to.
function wrongAccount(record, id, label) {
  if (!record?.account_id || record.account_id === id) return null;
  return { status: 'error', message: `This token is for ${label} (${id}), not the ID entered on this card.` };
}

const readPage = (token) => graphGet('me', { fields: 'id,name,instagram_business_account{id,username}' }, token);
// Links the Page to this app's webhook for lead forms and messages (Instagram messages need it too).
const subscribe = (page, token) => graphPost(`${page.id}/subscribed_apps`, { subscribed_fields: 'leadgen,messages' }, token);

async function checkFacebook(record, secret) {
  const token = secret('META_PAGE_ACCESS_TOKEN');
  const page = await readPage(token);
  const wrong = wrongAccount(record, page.id, `Page "${page.name}"`);
  if (wrong) return wrong;
  await subscribe(page, token);
  return {
    status: 'connected',
    message: `Page "${page.name}" now sends its lead forms and Messenger messages to the app.`,
    account: { account_name: page.name, account_id: page.id },
  };
}

async function checkInstagram(record, secret) {
  const token = secret('META_PAGE_ACCESS_TOKEN');
  const page = await readPage(token);
  const ig = page.instagram_business_account;
  if (!ig) return { status: 'error', message: `No Instagram professional account is linked to Page "${page.name}".` };
  const wrong = wrongAccount(record, ig.id, `@${ig.username}`);
  if (wrong) return wrong;
  await subscribe(page, token);
  return {
    status: 'connected',
    message: `@${ig.username} (through Page "${page.name}") now sends its lead forms and direct messages to the app.`,
    account: { account_name: `@${ig.username}`, account_id: ig.id },
  };
}

// WhatsApp, TikTok and LinkedIn prove the connection with their first lead.
function untilFirstLead(record, ready, test) {
  if (!record?.last_lead_date) return { status: 'not_connected', message: `${ready} ${test}` };
  const when = record.last_lead_date.slice(0, 16).replace('T', ' ');
  return { status: 'connected', message: `${ready} Last lead received ${when} UTC.` };
}

async function checkWhatsApp(record, secret) {
  const sid = secret('TWILIO_ACCOUNT_SID');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
    headers: { Authorization: `Basic ${btoa(`${sid}:${secret('TWILIO_AUTH_TOKEN')}`)}` },
    signal: AbortSignal.timeout(10000),
  });
  const account = await res.json().catch(() => ({}));
  if (!res.ok) return { status: 'error', message: `Twilio refused the Account SID / Auth Token (${account.message || res.status}).` };
  if (account.status !== 'active') return { status: 'error', message: `Twilio account "${account.friendly_name}" is ${account.status}.` };
  return untilFirstLead(
    record,
    `Twilio account "${account.friendly_name}" is active.`,
    `Send a WhatsApp message to ${secret('TWILIO_WHATSAPP_NUMBER')} to finish the connection.`,
  );
}

const forwarded = (record) =>
  untilFirstLead(record, 'The forwarding secret is saved.', 'Send a test lead from Zapier or Make to finish the connection.');

const CHECKS = { facebook: checkFacebook, instagram: checkInstagram, whatsapp: checkWhatsApp, tiktok: forwarded, linkedin: forwarded };

export async function runConnectionCheck(platform, record, secret) {
  const missing = PLATFORM_SECRETS[platform].filter((name) => !secret(name));
  if (missing.length) return { status: 'not_connected', message: `Add ${missing.join(', ')} in the app's Secrets first.` };
  try {
    return await CHECKS[platform](record, secret);
  } catch (error) {
    // The platform's own reason (expired token, missing permission, network) is what staff need to see.
    return { status: 'error', message: error.message };
  }
}