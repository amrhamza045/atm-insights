import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { executiveContext } from '../_shared/executiveAccess.js';
import { supplyStock } from '../_shared/executiveSupplyStock.js';
import { supplyPurchasing } from '../_shared/executiveSupplyPurchasing.js';
import { supplySuppliers } from '../_shared/executiveSupplySuppliers.js';
import { supplyDishes } from '../_shared/executiveSupplyDishes.js';
import { supplyKitchen } from '../_shared/executiveSupplyKitchen.js';

// Executive Dashboard cost & supply figures, totalled on the server per action.
const REPORTS = { stock: supplyStock, purchasing: supplyPurchasing, suppliers: supplySuppliers, dishes: supplyDishes, kitchen: supplyKitchen };

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await executiveContext(base44);
    const input = (await req.json().catch(() => null)) || {};
    if (!Object.hasOwn(REPORTS, input.action)) return Response.json({ error: 'Unknown cost & supply report.' }, { status: 400 });
    return Response.json(await REPORTS[input.action](ctx, input));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Executive cost & supply figures failed:', error.message);
    return Response.json({ error: error.message }, { status });
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
