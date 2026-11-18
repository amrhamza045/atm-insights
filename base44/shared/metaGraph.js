// Meta Graph API calls for the Facebook / Instagram lead connection, made with the Page access token.

const GRAPH = 'https://graph.facebook.com/v25.0';

async function graph(method, path, params, token) {
  if (!token) throw new Error('META_PAGE_ACCESS_TOKEN is not set');
  const query = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${GRAPH}/${path}?${query}`, { method, signal: AbortSignal.timeout(10000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.message || `Meta answered ${res.status}`);
  return data;
}

export const graphGet = (path, params, token) => graph('GET', path, params, token);
export const graphPost = (path, params, token) => graph('POST', path, params, token);

// Form answers that fill the lead's own contact fields; every other answer is kept in the message.
const CONTACT_FIELDS = new Set(['full_name', 'first_name', 'last_name', 'email', 'work_email', 'phone_number', 'work_phone_number', 'company_name']);

function otherAnswers(fieldData = []) {
  return fieldData
    .filter((field) => field?.name && !CONTACT_FIELDS.has(field.name))
    .map((field) => `${field.name.replace(/[_?]+/g, ' ').trim()}: ${[].concat(field.values ?? []).join(', ')}`)
    .join('\n');
}

/**
 * Reads one Lead Ads submission. Campaign and ad names need ad-account access, so a smaller read
 * without them is tried next. If nothing can be read, a placeholder keeps the lead from being lost.
 * Returns { platform, item, problem? }.
 */
export async function readMetaLead(value, token) {
  const id = String(value.leadgen_id);
  const base = { external_id: `fb_lead:${id}`, notes: `Meta lead ${id}, form ${value.form_id || 'unknown'}` };
  let problem = '';
  for (const fields of ['field_data,platform,campaign_name,ad_name', 'field_data,platform']) {
    try {
      const lead = await graphGet(id, { fields }, token);
      const item = {
        ...base,
        field_data: lead.field_data,
        campaign_name: lead.campaign_name,
        ad_name: lead.ad_name,
        message: otherAnswers(lead.field_data),
      };
      return { platform: lead.platform === 'ig' ? 'instagram' : 'facebook', item };
    } catch (error) {
      problem = error.message;
    }
  }
  const message = `Lead details could not be read from Meta (${problem}). Open lead ${id} in Meta Leads Center.`;
  return { platform: 'facebook', problem, item: { ...base, message } };
}

/** Name (and Instagram username) of a Messenger / Instagram sender; blank when Meta won't share it. */
export async function readMetaSender(id, platform, token) {
  try {
    const profile = await graphGet(id, { fields: platform === 'instagram' ? 'name,username' : 'name' }, token);
    return { sender_name: profile.name || '', username: profile.username || '' };
  } catch {
    return { sender_name: '', username: '' };
  }
}