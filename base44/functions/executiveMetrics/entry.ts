import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { executiveContext } from '../../shared/executiveAccess.js';
import { executiveMetrics } from '../../shared/executiveMetrics.js';

// Executive Dashboard catering and CRM figures (totals only) for the picked
// branches and the standard period.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await executiveContext(base44);
    const input = await req.json().catch(() => ({}));
    return Response.json(await executiveMetrics(ctx, input));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Executive metrics failed:', error.message);
    return Response.json({ error: error.message }, { status });
  }
}