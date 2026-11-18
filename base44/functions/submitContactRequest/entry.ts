import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000;
const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function hashKey(key) {
  const data = new TextEncoder().encode(`contact-rl:${Deno.env.get('BASE44_APP_ID') || ''}:${key}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));

    const name = str(body.name, 120);
    const phone = str(body.phone, 40);
    const governorate = str(body.governorate, 60);
    if (!name || !phone || !governorate) {
      return Response.json({ error: 'Name, phone and governorate are required.' }, { status: 400 });
    }

    // Per-browser limit: the form sends a random ID kept in the visitor's browser.
    const browserId = str(body.browser_id, 100);
    if (!/^[0-9a-f-]{36}$/i.test(browserId)) {
      return Response.json({ error: 'Please refresh the page and try again.' }, { status: 400 });
    }
    const visitor_key = await hashKey(browserId);
    const now = Date.now();
    const since = new Date(now - WINDOW_MS).toISOString();

    await db.ContactRateLimit.deleteMany({ visitor_key, submitted_at: { $lt: since } });

    // Claim a slot, then rank: only the first LIMIT slots (by time, then id) win,
    // so overlapping submissions can't all pass.
    const slot = await db.ContactRateLimit.create({ visitor_key, submitted_at: new Date(now).toISOString() });
    const page = await db.ContactRateLimit.filter({ visitor_key, submitted_at: { $gte: since } }, { sort: 'submitted_at', limit: 50 });
    const items = (page.items || page).slice().sort((a, b) =>
      a.submitted_at === b.submitted_at ? String(a.id).localeCompare(String(b.id)) : a.submitted_at < b.submitted_at ? -1 : 1);
    const rank = items.findIndex((s) => s.id === slot.id);
    if (rank === -1 || rank >= LIMIT) {
      await db.ContactRateLimit.delete(slot.id);
      const oldest = new Date(items[0].submitted_at).getTime();
      const retryMinutes = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 60000));
      return Response.json({
        error: `You've sent several requests recently. Please try again in about ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}.`,
        retry_after_minutes: retryMinutes,
      }, { status: 429 });
    }

    const packages = Array.isArray(body.packages) ? body.packages.map((p) => str(p, 500)).filter(Boolean).slice(0, 20) : [];
    const packageList = packages.join(', ');
    const event_type = str(body.event_type, 100);
    const event_date = str(body.event_date, 20);
    const guests = str(String(body.guests ?? ''), 10);
    const notes = str(body.notes, 2000);

    try {
      await db.Lead.create({
        sender_name: name,
        phone,
        phone_number: phone,
        email: str(body.email, 200),
        governorate,
        address: str(body.address, 300),
        brand_purpose: packageList ? `Catering packages: ${packageList}` : 'Catering enquiry (contact us)',
        status: 'new',
        campaign: 'Contact us',
        message_text: [
          packageList ? `Packages requested: ${packageList}` : 'General catering enquiry',
          event_type ? `Event type: ${event_type}` : null,
          event_date ? `Event date: ${event_date}` : null,
          guests ? `Expected guests: ${guests}` : null,
          notes ? `Notes: ${notes}` : null,
        ].filter(Boolean).join('\n'),
      });
    } catch (leadError) {
      await db.ContactRateLimit.delete(slot.id).catch(() => {});
      throw leadError;
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}