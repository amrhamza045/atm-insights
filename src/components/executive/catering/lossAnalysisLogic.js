import { formatCurrency } from "@/components/utils/currencyFormatter";

export const CANONICAL_KEYS = [
  "revenue_variance", "food_cost_variance", "other_cost_variance",
  "labor_cost_variance", "labor_baseline_alignment", "equipment_cost_variance", "exception_cost_variance",
  "client_recovered_equipment_costs",
];

export const statusMeta = {
  loss: { label: "Loss", className: "bg-red-100 text-red-700 border-red-200" },
  underperforming: { label: "Underperforming", className: "bg-warning-100 text-warning-700 border-warning-200" },
  on_target: { label: "On target", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  insufficient_data: { label: "Insufficient data", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export const sourceLabel = (source) => ({
  package: "Package override", "event-type": "Event-type override",
  "catering-default": "Catering default", "restaurant-default": "Restaurant default",
}[source] || "Not resolved");

export function missingSourceSummary(run) {
  const warnings = run?.warning_codes || [];
  const missing = [];
  if (!Number(run?.source_counts?.slips) || warnings.some((code) => code.startsWith("food_"))) missing.push("food");
  if (!Number(run?.source_counts?.attendance) || warnings.some((code) => /labor|attendance|shift|assignment/.test(code))) missing.push("labor");
  if (warnings.some((code) => /equipment|damage|replacement/.test(code))) missing.push("equipment");
  return missing.length ? missing.join(" / ") : "required";
}

const money = (value) => formatCurrency(Math.abs(Number(value) || 0), true);
const direction = (line, bad, good) => line.delta < 0 ? bad : good;

export function narrativeSentence(line) {
  const amount = money(line.delta);
  switch (line.key) {
    case "revenue_variance": return direction(line, `Revenue finished ${amount} below the quoted baseline, reducing margin.`, `Revenue finished ${amount} above the quoted baseline, improving margin.`);
    case "food_cost_variance": return direction(line, `Food costs exceeded the quote baseline by ${amount}, reducing margin.`, `Food costs were ${amount} below the quote baseline, improving margin.`);
    case "other_cost_variance": return `Other quoted costs contributed ${amount} to the margin bridge.`;
    case "labor_cost_variance": return direction(line, `Labor costs exceeded the locked staffing baseline by ${amount}, reducing margin.`, `Labor costs were ${amount} below the locked staffing baseline, improving margin.`);
    case "labor_baseline_alignment": return `This package's quoted margin doesn't account for ${amount} of expected labor, so the package pricing baseline overstates margin.`;
    case "equipment_cost_variance": return direction(line, `Equipment damage or loss reduced margin by ${amount}.`, `Equipment costs improved margin by ${amount}.`);
    case "client_recovered_equipment_costs": return `Client-recovered equipment charges restored ${amount} to margin.`;
    default: return "";
  }
}

export function actionFor(line, event, quote) {
  const eventQuery = `event_id=${encodeURIComponent(event.id)}`;
  if (line.key === "food_cost_variance") return { label: "Review recipes and ingredient costs", to: "/MenuManagement" };
  if (line.key === "labor_cost_variance") return { label: "Review event staffing plan", to: `/Catering?tab=staffing&${eventQuery}` };
  if (line.key === "labor_baseline_alignment") return { label: "Review package pricing", to: `/Catering?tab=packages&package_id=${encodeURIComponent(quote?.package_id || "")}` };
  if (line.key === "equipment_cost_variance") return { label: "Review equipment handling and damage", to: `/Catering?tab=equipment&${eventQuery}` };
  if (line.key === "revenue_variance" && line.delta < 0) return { label: "Review event pricing and quote", to: `/Catering?tab=quotes&${eventQuery}` };
  return null;
}

export function rankedLines(run) {
  const byKey = Object.fromEntries((run?.margin_bridge_lines || []).map((line) => [line.key, line]));
  return (run?.margin_bridge_ranking || []).map((rank) => ({ ...byKey[rank.key], ...rank })).filter((line) => line.key && Number(line.delta) !== 0);
}