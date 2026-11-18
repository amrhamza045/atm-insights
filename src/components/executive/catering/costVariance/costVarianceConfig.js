// What Cost Variance shows on its cards and tables.
const SOURCE = "Catering › delivered events of the selected branches with complete actual costs: their quotes, staffing plans, latest actual-cost calculations and cost exceptions.";

export const KPIS = ["planned_cost", "actual_cost", "cost_vs_estimate", "cost_vs_estimate_pct", "over_estimate_events"];

export const BRIDGE_INFO = {
  calculation: "The planned cost of the events, then how far each cost type ran over (red) or under (green) its plan, adding up to the actual cost.",
  source: SOURCE,
};

export const TYPE_TABLE = {
  columns: [["planned", "Planned", "money", "none"], ["actual", "Actual", "money", "down"], ["vs_estimate", "vs estimate", "money", "down"], ["vs_estimate_pct", "vs estimate %", "percent", "down"]],
  info: {
    calculation: "Each cost type across the events. Planned: food & ingredients and other quoted costs from the quote's cost estimate, labour from the staffing plan; equipment and transport have no plan, so any cost there runs over. Actual: the latest actual-cost calculation plus active cost exceptions; other quoted costs only get an actual through cost exceptions. Above zero is over plan.",
    source: SOURCE,
  },
  empty: "No costs recorded.",
};

export const GROUP_TABLE = {
  columns: [["events_compared", "Events", "number", "none"], ["planned_cost", "Planned", "money", "none"], ["actual_cost", "Actual", "money", "down"], ["cost_vs_estimate", "vs estimate", "money", "down"], ["over_estimate_events", "Over", "number", "down"]],
  info: { calculation: "The events with complete actual costs, their planned and actual cost, the cost over estimate (actual less planned; above zero is an overspend) and how many ran over. Biggest overspend first.", source: SOURCE },
  empty: "No events with complete actual costs.",
};

export const RECIPE_TABLE = {
  columns: [["batches", "Batches", "number", "none"], ["planned", "Planned", "money", "none"], ["actual", "Actual", "money", "down"], ["vs_plan", "vs plan", "money", "down"], ["yield_pct", "Yield", "percent"]],
  info: {
    calculation: "Completed catering production batches of these events per recipe. Planned: batches × the recipe's current batch cost; actual: the ingredients consumed when each batch was completed (already part of food cost above). Yield: output made ÷ output planned × 100. Biggest overspend first.",
    source: "Manufacturing › completed catering production batches of these events and their recipes.",
  },
  empty: "No completed production batches with a recipe on file.",
};