import { numberOrNull } from './cateringActualCostCommon.js';

export function resolveMarginBenchmark({ packageRecord, eventTypeRule, settings }) {
  const candidates = [
    ['package', packageRecord?.target_margin_percentage],
    ['event-type', eventTypeRule?.target_margin_percentage],
    ['catering-default', settings?.catering_target_margin_percentage],
    ['restaurant-default', settings?.overall_restaurant_margin_percentage],
  ];
  for (const [source, value] of candidates) {
    const margin = numberOrNull(value);
    if (margin !== null) return { percentage: margin, source };
  }
  return { percentage: 30, source: 'restaurant-default' };
}

export function classifyLossAnalysis(fields, benchmark) {
  if (fields.actual_cost_status !== 'complete') return 'insufficient_data';
  if (Number(fields.actual_margin) < 0) return 'loss';
  return Number(fields.actual_margin_percentage) >= benchmark.percentage ? 'on_target' : 'underperforming';
}