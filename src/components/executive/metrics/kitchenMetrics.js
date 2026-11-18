// The Kitchen Performance figures of the Executive Dashboard (part of METRICS):
// label, calculation, source, format and which way is better.
const BATCHES = "Head Chef board › production batches of the selected branches finished in the period, by the day each was finished.";
const RECIPES = "Manufacturing › recipes, as they are today.";
const OPEN = "Head Chef board › production batches of the selected branches not yet finished or cancelled.";
const POINTS = "Changes are shown in percentage points.";

export const KITCHEN_METRICS = {
  kitchen_batches: { label: "Batches finished", format: "number", goodWhen: "none", calculation: "Production batches finished in the period, sub-recipe batches included. A batch counts once, whatever quantity it makes.", source: BATCHES },
  kitchen_on_time_rate: { label: "Ready on time", format: "percent", goodWhen: "up", calculation: "Batches finished on or before their needed-by date (the event date for catering batches) ÷ the finished batches with a needed-by date × 100.", source: BATCHES, note: POINTS },
  kitchen_prep_hours: { label: "Prep time", format: "hours", goodWhen: "down", calculation: "Hours from Start to Finish on the Head Chef board, averaged over the batches. Batches started and finished within a minute, or never started, are left out: they were clicked through after the work, not as it happened.", source: BATCHES },
  kitchen_overdue: { label: "Overdue batches", format: "number", goodWhen: "down", calculation: "Open batches whose needed-by date has passed.", source: OPEN, note: "A snapshot as of today, so it doesn't follow the period." },
  kitchen_cost: { label: "Production cost", format: "money", goodWhen: "none", calculation: "The ingredient cost recorded on each finished batch, added up. A sub-recipe batch counts on its own and again inside the batch that uses what it made.", source: BATCHES },
  kitchen_over_recipe: { label: "Cost vs recipe", format: "money", goodWhen: "down", calculation: "Each batch's recorded cost less what its recipe costs today for the planned quantity, added up. Above zero means the batches cost more than their recipes. Batches whose recipe no longer exists or has no cost are left out.", source: `${BATCHES} ${RECIPES}`, note: "It compares with today's recipe costs, so it has no change of its own." },
  kitchen_yield_pct: { label: "Yield", format: "percent", goodWhen: "up", calculation: "Each batch's recorded output ÷ what its recipe gives for the planned quantity × 100, averaged over the batches. When no output is entered at Finish, the recipe's output is recorded, so the batch shows 100%. Batches whose recipe no longer exists are left out.", source: `${BATCHES} ${RECIPES}`, note: POINTS },
  kitchen_catering_share: { label: "For catering", format: "percent", goodWhen: "none", calculation: "Batches made for a catering event ÷ all finished batches × 100.", source: BATCHES, note: POINTS },
};