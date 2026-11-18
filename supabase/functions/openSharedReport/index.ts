import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';

// Public (no login) opener for shared report links. The unguessable token is
// the credential; each open gets a fresh 1-hour file link.
const page = (title, text, status) => new Response(
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>` +
  `<body style="font-family:system-ui,Arial,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">` +
  `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;max-width:420px;text-align:center">` +
  `<h2 style="margin:0 0 12px;color:#0f172a">${title}</h2><p style="color:#475569;margin:0">${text}</p></div></body></html>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
);

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const token = new URL(req.url).searchParams.get('t') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) return page('Link not valid', 'This report link is not valid. Please ask the sender for a new one.', 404);

    const link = (await base44.asServiceRole.entities.SharedReportLink.filter({ token }))[0];
    if (!link) return page('Link not valid', 'This report link is not valid. Please ask the sender for a new one.', 404);
    if (new Date(link.expires_at).getTime() < Date.now()) {
      return page('This link has expired', 'This report link has expired. Please ask the sender to share the report again.', 410);
    }

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: link.file_uri, expires_in: 3600 });
    await base44.asServiceRole.entities.SharedReportLink.update(link.id, { open_count: (link.open_count || 0) + 1 });
    return new Response(null, { status: 302, headers: { Location: signed_url, 'Cache-Control': 'no-store' } });
  } catch (error) {
    return page('Something went wrong', 'The report could not be opened right now. Please try again later.', 500);
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
