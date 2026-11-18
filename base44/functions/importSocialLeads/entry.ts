import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { normalizeSocialLead, nextLeadNumber } from '../../shared/socialLeadNormalizer.js';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';

// Pulls Instagram post comments and Facebook Page message threads and turns
// each new one into a Lead. Dedupes on external_id so re-running is safe.

async function fetchInstagramItems(base44) {
  const items = [];
  const conn = await base44.asServiceRole.connectors.getConnection('instagram').catch(() => null);
  if (!conn?.accessToken) return items;

  const url = `https://graph.instagram.com/me/media?fields=id,caption,permalink,comments{id,text,username,timestamp}&limit=25&access_token=${conn.accessToken}`;
  const res = await fetch(url).then((r) => r.json());
  if (res.error) return items;

  (res.data || []).forEach((media) => {
    (media.comments?.data || []).forEach((c) => {
      items.push({
        external_id: `ig_comment:${c.id}`,
        platform: 'instagram',
        contact_username: c.username || '',
        sender_name: c.username || '',
        message: c.text || '',
        brand_purpose: c.text || '',
        campaign: (media.caption || '').slice(0, 60),
        notes: media.permalink || ''
      });
    });
  });
  return items;
}

async function fetchFacebookItems(base44) {
  const items = [];
  const conn = await base44.asServiceRole.connectors.getConnection('facebook_pages').catch(() => null);
  if (!conn?.accessToken) return items;

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${conn.accessToken}`
  ).then((r) => r.json());
  if (pagesRes.error) return items;

  for (const page of pagesRes.data || []) {
    const convRes = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}/conversations?fields=participants,messages.limit(5){id,message,from,created_time}&limit=25&access_token=${page.access_token}`
    ).then((r) => r.json());
    if (convRes.error) continue;

    (convRes.data || []).forEach((conv) => {
      (conv.messages?.data || []).forEach((m) => {
        // Skip messages the page itself sent
        if (m.from?.id === page.id) return;
        items.push({
          external_id: `fb_message:${m.id}`,
          platform: 'facebook',
          contact_username: m.from?.name || '',
          sender_name: m.from?.name || '',
          message: m.message || '',
          brand_purpose: m.message || '',
          campaign: page.name || '',
          notes: `Facebook Page: ${page.name}`
        });
      });
    });
  }
  return items;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Staff with Social Media access only (the Import button in Social Leads); nothing runs it on a schedule.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const denied = await denyUnlessPermitted(base44, user, 'social_media_view');
    if (denied) return denied;

    const [igItems, fbItems] = await Promise.all([
      fetchInstagramItems(base44),
      fetchFacebookItems(base44)
    ]);
    const incoming = [...igItems, ...fbItems];

    const existing = await base44.asServiceRole.entities.Lead.list('-created_date', 500);
    const seen = new Set(existing.map((l) => l.external_id).filter(Boolean));

    const fresh = incoming.filter((i) => i.external_id && !seen.has(i.external_id));
    if (fresh.length === 0) {
      return Response.json({ ok: true, created: 0, scanned: incoming.length });
    }

    const base = parseInt(nextLeadNumber(existing).split('-')[1], 10);
    const records = fresh.map((item, i) => ({
      ...normalizeSocialLead(item),
      external_id: item.external_id,
      notes: item.notes || '',
      lead_number: `LEAD-${String(base + i).padStart(4, '0')}`
    }));

    await base44.asServiceRole.entities.Lead.bulkCreate(records);
    return Response.json({ ok: true, created: records.length, scanned: incoming.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}