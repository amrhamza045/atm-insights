import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { executiveContext } from '../_shared/executiveAccess.js';
import { executiveFinanceSummary } from '../_shared/executiveFinance.js';
import { executivePnl } from '../_shared/executivePnl.js';
import { executiveRevenue } from '../_shared/executiveRevenue.js';
import { executiveCosts } from '../_shared/executiveCosts.js';
import { executiveCash } from '../_shared/executiveCash.js';
import { executiveBranches } from '../_shared/executiveBranches.js';

// Executive Dashboard ledger figures (totals only) for the header picker's
// company or branch and the standard period, one report per action.
const REPORTS = {
  summary: executiveFinanceSummary,
  pnl: executivePnl,
  revenue: executiveRevenue,
  costs: executiveCosts,
  cash: executiveCash,
  branches: executiveBranches,
};

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await executiveContext(base44);
    const input = (await req.json().catch(() => null)) || {};
    if (!Object.hasOwn(REPORTS, input.action)) return Response.json({ error: 'Unknown Executive Dashboard report.' }, { status: 400 });
    return Response.json(await REPORTS[input.action](ctx, input));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Executive finance figures failed:', error.message);
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
