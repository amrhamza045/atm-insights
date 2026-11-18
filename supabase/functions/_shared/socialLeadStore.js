// Saves leads arriving from the platforms set up in Admin › Systems › Social Media.
import { normalizeSocialLead, nextLeadNumber } from './socialLeadNormalizer.js';

const MERGE_WINDOW_MS = 60 * 60 * 1000;

/** The platform's saved card; null until it has been saved once. */
export async function loadConnection(svc, platform) {
  const [connection] = await svc.entities.SocialMediaConnection.filter({ platform });
  return connection || null;
}

// A lead getting through proves the connection works.
async function noteArrival(svc, connection) {
  await svc.entities.SocialMediaConnection.update(connection.id, {
    connection_status: 'connected',
    last_lead_date: new Date().toISOString(),
  });
}

async function createLeads(svc, platform, connection, items) {
  const latest = await svc.entities.Lead.list('-created_date', 500);
  const first = parseInt(nextLeadNumber(latest).split('-')[1], 10);
  const records = items.map((item, i) => {
    const lead = normalizeSocialLead({ ...item, platform });
    return {
      ...lead,
      campaign: lead.campaign || connection.default_campaign || '',
      external_id: item.external_id || '',
      notes: item.notes || '',
      lead_number: `LEAD-${String(first + i).padStart(4, '0')}`,
    };
  });
  await svc.entities.Lead.bulkCreate(records);
  await noteArrival(svc, connection);
  return records.length;
}

/**
 * Form leads (lead ads, Zapier / Make). Ignored while the platform is switched off; a lead already
 * stored under the same external_id is not stored again. Returns how many leads were created.
 */
export async function saveFormLeads(svc, platform, connection, items) {
  if (!connection?.is_enabled || !items.length) return 0;
  const ids = items.map((item) => item.external_id).filter(Boolean);
  const known = ids.length ? await svc.entities.Lead.filter({ external_id: { $in: ids } }) : [];
  const stored = new Set(known.map((lead) => lead.external_id));
  const fresh = items.filter((item) => !item.external_id || !stored.has(item.external_id));
  return fresh.length ? createLeads(svc, platform, connection, fresh) : 0;
}

/**
 * Chat messages (WhatsApp, Messenger, Instagram direct messages). Ignored while the platform is
 * switched off. A message within an hour of the sender's latest lead is added to that lead;
 * otherwise it opens a new one. Returns 'created', 'updated' or 'skipped'.
 */
export async function saveMessageLead(svc, platform, connection, { senderKey, text, ...fields }) {
  if (!connection?.is_enabled) return 'skipped';
  const external_id = `${platform}_sender:${senderKey}`;
  const [latest] = await svc.entities.Lead.filter({ external_id }, '-created_date', 1);
  if (latest && Date.now() - new Date(latest.created_date).getTime() < MERGE_WINDOW_MS) {
    await svc.entities.Lead.update(latest.id, {
      message_text: [latest.message_text, text].filter(Boolean).join('\n\n'),
      sender_name: fields.sender_name || latest.sender_name || '',
    });
    await noteArrival(svc, connection);
    return 'updated';
  }
  await createLeads(svc, platform, connection, [{ ...fields, message: text, external_id }]);
  return 'created';
}