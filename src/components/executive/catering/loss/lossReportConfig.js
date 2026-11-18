// What Loss Analysis shows on its cards and tables.
const SOURCE = "Catering › delivered events of the selected branches (status Completed, by event date): the latest actual-cost calculation of each.";

export const KPIS = ["below_target_events", "loss_events", "below_target_rate", "margin_shortfall", "margin_vs_quote", "insufficient_events"];

export const STATUS_CARD = {
  title: "How the events did",
  info: { calculation: "Delivered events by how their margin compares with their target margin, with their event revenue. Events with incomplete actual costs can't be judged yet.", source: SOURCE },
  tones: { on_target: "bg-success-500", underperforming: "bg-warning-400", loss: "bg-danger-500", insufficient_data: "bg-slate-300" },
  empty: "No events were delivered in this period.",
};

export const BRIDGE_INFO = {
  calculation: "The margin expected when each event was quoted, then each factor of its margin bridge (green helped margin, red took it away), adding up to the actual margin, across the events with complete actual costs.",
  source: SOURCE,
};

export const FACTOR_TABLE = {
  columns: [["events_hurt", "Events hurt", "number", "down"], ["margin_lost", "Margin lost", "money", "down"], ["net_impact", "Net effect", "money"]],
  info: { calculation: "Each factor of the margin bridge: on how many events it reduced margin, the margin it took away on those events, and its net effect once the events where it helped are counted.", source: SOURCE },
  empty: "No margin factors recorded.",
};

export const GROUP_TABLE = {
  columns: [["events_judged", "Events", "number", "none"], ["below_target_events", "Below target", "number", "down"], ["below_target_rate", "Rate", "percent", "down"], ["margin_shortfall", "Short of target", "money", "down"]],
  info: { calculation: "Delivered events with complete actual costs, how many fell below their target margin, that share, and the margin they were short of target.", source: SOURCE },
  empty: "No delivered events.",
};