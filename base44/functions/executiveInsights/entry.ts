import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { executiveContext } from '../../shared/executiveAccess.js';
import { executiveAlerts } from '../../shared/executiveAlerts.js';
import { executiveOutlook } from '../../shared/executiveOutlook.js';
import { executiveAiInsights } from '../../shared/executiveAiInsights.js';

// Executive Dashboard Alerts & insights: today's alerts, the 90-day outlook and
// (on request only) AI insights over the dashboard's own figures.
const REPORTS = { alerts: executiveAlerts, outlook: executiveOutlook, ai: executiveAiInsights };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await executiveContext(base44);
    const input = (await req.json().catch(() => null)) || {};
    if (!Object.hasOwn(REPORTS, input.action)) return Response.json({ error: 'Unknown insights report.' }, { status: 400 });
    return Response.json(await REPORTS[input.action](ctx, input));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Executive insights failed:', error.message);
    return Response.json({ error: error.message }, { status });
  }
}