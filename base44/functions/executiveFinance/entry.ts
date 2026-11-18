import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { executiveContext } from '../../shared/executiveAccess.js';
import { executiveFinanceSummary } from '../../shared/executiveFinance.js';
import { executivePnl } from '../../shared/executivePnl.js';
import { executiveRevenue } from '../../shared/executiveRevenue.js';
import { executiveCosts } from '../../shared/executiveCosts.js';
import { executiveCash } from '../../shared/executiveCash.js';
import { executiveBranches } from '../../shared/executiveBranches.js';

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

export default async function(req) {
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