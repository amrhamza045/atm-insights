import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { checkPermission } from '../_shared/requirePermission.js';

const PRIORITIES = ['none', 'push', 'slow'];

// Settings tabs steer every station; "Set selling priority" steers the station
// of the display the person works on (kitchen display → kitchen, bar display → bar).
function ownStation(perms) {
  if (perms.admin_settings === true) return null;
  if (perms.kds_view === true && perms.kds_bar_view !== true) return 'kitchen';
  if (perms.kds_bar_view === true && perms.kds_view !== true) return 'bar';
  return null;
}

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const check = await checkPermission(base44, user, ['selling_priority_manage', 'admin_settings']);
    if (!check.allowed) return Response.json({ error: check.reason }, { status: check.status });

    const { menu_item_id, sell_priority, steering_note } = await req.json().catch(() => ({}));
    if (!menu_item_id) return Response.json({ error: 'menu_item_id is required' }, { status: 400 });
    if (sell_priority === undefined && steering_note === undefined) {
      return Response.json({ error: 'Nothing to change' }, { status: 400 });
    }
    if (sell_priority !== undefined && !PRIORITIES.includes(sell_priority)) {
      return Response.json({ error: 'Invalid priority' }, { status: 400 });
    }

    const item = await base44.asServiceRole.entities.MenuItem.get(menu_item_id)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!item) return Response.json({ error: 'Menu item not found' }, { status: 404 });

    const station = ownStation(check.permissions || {});
    if (station && (item.preparation_station || 'kitchen') !== station) {
      return Response.json({ error: `You can only set priorities for ${station} items` }, { status: 403 });
    }

    const patch = { steering_updated_by: user.email, steering_updated_at: new Date().toISOString() };
    if (sell_priority !== undefined) patch.sell_priority = sell_priority;
    if (steering_note !== undefined) patch.steering_note = String(steering_note || '').slice(0, 500);
    await base44.asServiceRole.entities.MenuItem.update(menu_item_id, patch);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
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
