import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { executiveContext } from '../../shared/executiveAccess.js';
import { cateringPnl } from '../../shared/executiveCateringPnl.js';
import { cateringPipeline } from '../../shared/executiveCateringPipeline.js';
import { cateringLoss } from '../../shared/executiveCateringLoss.js';
import { cateringStaffing } from '../../shared/executiveCateringStaffing.js';
import { cateringVariance } from '../../shared/executiveCateringVariance.js';
import { cateringEquipment } from '../../shared/executiveCateringEquipment.js';
import { cateringFeedback } from '../../shared/executiveCateringFeedback.js';
import { cateringAdvisor } from '../../shared/executiveCateringAdvisor.js';

// Executive Dashboard catering figures, totalled on the server per action.
const REPORTS = {
  pnl: cateringPnl, pipeline: cateringPipeline, loss: cateringLoss, staffing: cateringStaffing,
  variance: cateringVariance, equipment: cateringEquipment, feedback: cateringFeedback, advisor: cateringAdvisor,
};

export default async function(req) {
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