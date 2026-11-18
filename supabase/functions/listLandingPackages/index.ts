import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';

/**
 * Package catalogue for the public landing page. Deliberately open to visitors:
 * reads active packages with the service role and returns only what the page
 * shows (names, descriptions, prices, pictures, optional extras), never costs,
 * margins, equipment or internal notes.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const rows = await base44.asServiceRole.entities.CateringPackage.filter({ is_active: true });
    const packages = (rows || []).map((p) => ({
      id: p.id,
      name: p.name || '',
      description: p.description || '',
      package_category: p.package_category || '',
      pricing_mode: p.pricing_mode || 'itemized',
      base_price_per_guest: p.base_price_per_guest || 0,
      flat_price: p.flat_price || 0,
      min_guests: p.min_guests || 0,
      cover_image_url: p.cover_image_url || '',
      cover_video_url: p.cover_video_url || '',
      media_gallery: (p.media_gallery || []).map((m) => ({ type: m.type || 'image', url: m.url, caption: m.caption || '' })),
      line_items: (p.line_items || []).map((li) => ({ name: li.name || '' })),
      extra_items: (p.extra_items || []).map((x) => ({ name: x.name, description: x.description || '', price: x.price || 0, scaling: x.scaling || 'fixed' })),
    }));
    return Response.json({ packages });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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
