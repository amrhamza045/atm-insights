import { cateringScope, replyHead } from './executiveCateringCommon.js';
import { executiveAlerts } from './executiveAlerts.js';
import { executiveOutlook } from './executiveOutlook.js';
import { executiveFinanceSummary } from './executiveFinance.js';
import { cateringPnl } from './executiveCateringPnl.js';
import { cateringPipeline } from './executiveCateringPipeline.js';

// AI Business Insights: run only on request. Gathers the dashboard's own
// figures for the period (ledger summary, catering results and pipeline), today's
// alerts and the 90-day outlook, then asks the AI for prioritised actions. The
// AI sees totals only, no client or staff names.
const REPORTS = ['summary', 'pnl', 'revenue', 'costs', 'cash', 'catering', 'pipeline', 'advisor', 'stockwaste', 'purchasing', 'suppliers', 'labor', 'leads', 'clients', 'care', 'alerts', 'predict'];
const AREAS = ['Finance', 'Cash', 'Catering', 'Purchasing', 'Stock', 'People', 'Clients'];
const PRIORITIES = ['high', 'medium', 'low'];

// Flat figures only, rounded, so the prompt stays small.
const slim = (o) => (o ? Object.fromEntries(Object.entries(o).filter(([, v]) => v === null || ['number', 'string', 'boolean'].includes(typeof v)).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 100) / 100 : v])) : null);
const pair = (r) => (r?.available && r.ready !== false ? { current: slim(r.current), previous: slim(r.previous) } : 'not available');
const text = (v, max) => String(v || '').trim().slice(0, max);

const SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' }, finding: { type: 'string' }, action: { type: 'string' },
          area: { type: 'string', enum: AREAS }, priority: { type: 'string', enum: PRIORITIES }, report: { type: 'string', enum: REPORTS },
        },
        required: ['title', 'finding', 'action', 'area', 'priority'],
      },
    },
  },
  required: ['headline', 'insights'],
};

export async function executiveAiInsights(ctx, input) {
  const scope = await cateringScope(ctx, input);
  const seesFinance = !!(ctx.admin || ctx.permissions.financial_view), catering = scope.isOn('catering');
  const plain = { ...input, filter: undefined };
  const [ledger, pnl, pipeline, alerts, outlook] = await Promise.all([
    seesFinance && scope.isOn('financial') ? executiveFinanceSummary(ctx, plain) : null,
    catering ? cateringPnl(ctx, plain) : null,
    catering ? cateringPipeline(ctx, plain) : null,
    executiveAlerts(ctx, plain),
    catering ? executiveOutlook(ctx, plain) : null,
  ]);
  if (ledger?.ready === false) return { ready: false };
  const facts = {
    currency: scope.currency, today: scope.today,
    period: scope.period, compared_with: scope.comparison,
    ledger: ledger ? pair(ledger) : 'not shown',
    catering_results: pair(pnl),
    catering_enquiries: pair(pipeline),
    catering_booked_ahead: pipeline?.available ? slim(pipeline.ahead) : 'not available',
    alerts_today: alerts.alerts.map((a) => ({ alert: a.key, priority: a.priority, count: a.count ?? null, amount: a.amount ?? null, extra: typeof a.extra === 'number' ? a.extra : null })),
    outlook: outlook?.available ? { booking_rate: outlook.rate, horizons: outlook.horizons.map(slim), overdue_from_clients: outlook.overdue_now, supplier_overdue: outlook.supplier_overdue, staff_on_books: outlook.staff_on_books } : 'not available',
  };
  const prompt = `You advise the management of a catering business. Review its figures for ${scope.period.label} (${scope.period.from} to ${scope.period.to}), compared with ${scope.comparison.label} (${scope.comparison.from} to ${scope.comparison.to}), plus today's alerts and the outlook for the next 30, 60 and 90 days (as of ${scope.today}). Money is in ${scope.currency || 'the company currency'}.

Rules:
- Use only the figures given. Never invent numbers, causes or data that is not there. If something important is missing, you may say so once.
- Write 4 to 7 insights, most important first. Each has a short title, the finding with the figures that show it (compare with the earlier period where you can), and one concrete action the team can take this week.
- Priority: high = money, an event or a client at risk now; medium = a trend to act on; low = worth knowing.
- Area: one of ${AREAS.join(', ')}. Report: the dashboard report where the detail is, one of ${REPORTS.join(', ')}.
- The headline is two sentences on how the business is doing overall.
- Plain business English, no jargon, no markdown, no em dashes.

Figures (JSON): ${JSON.stringify(facts)}`;
  const reply = await ctx.base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });
  const insights = (Array.isArray(reply?.insights) ? reply.insights : []).slice(0, 8).map((x, i) => ({
    id: String(i + 1), title: text(x.title, 140), finding: text(x.finding, 700), action: text(x.action, 400),
    area: AREAS.includes(x.area) ? x.area : null, priority: PRIORITIES.includes(x.priority) ? x.priority : 'medium', report: REPORTS.includes(x.report) ? x.report : null,
  })).filter((x) => x.title && x.finding);
  return { ...replyHead(scope), available: true, generated_at: new Date().toISOString(), headline: text(reply?.headline, 600), insights };
}