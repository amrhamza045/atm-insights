import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { executiveContext } from '../_shared/executiveAccess.js';
import { cateringPnl } from '../_shared/executiveCateringPnl.js';
import { cateringPipeline } from '../_shared/executiveCateringPipeline.js';
import { cateringLoss } from '../_shared/executiveCateringLoss.js';
import { cateringStaffing } from '../_shared/executiveCateringStaffing.js';
import { cateringVariance } from '../_shared/executiveCateringVariance.js';
import { cateringEquipment } from '../_shared/executiveCateringEquipment.js';
import { cateringFeedback } from '../_shared/executiveCateringFeedback.js';
import { cateringAdvisor } from '../_shared/executiveCateringAdvisor.js';

// Executive Dashboard catering figures, totalled on the server per action.
const REPORTS = {
  pnl: cateringPnl, pipeline: cateringPipeline, loss: cateringLoss, staffing: cateringStaffing,
  variance: cateringVariance, equipment: cateringEquipment, feedback: cateringFeedback, advisor: cateringAdvisor,
};

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await executiveContext(base44);
    const input = (await req.json().catch(() => null)) || {};
    if (!Object.hasOwn(REPORTS, input.action)) return Response.json({ error: 'Unknown catering report.' }, { status: 400 });
    return Response.json(await REPORTS[input.action](ctx, input));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Executive catering figures failed:', error.message);
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
