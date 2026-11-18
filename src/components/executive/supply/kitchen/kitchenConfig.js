// What Kitchen Performance shows on its cards and tables.
const BATCHES = "Head Chef board › production batches of the selected branches finished in the period, by the day each was finished.";
const RECIPES = "Manufacturing › recipes, as they are today.";

export const KPIS = [["kitchen_batches"], ["kitchen_on_time_rate"], ["kitchen_prep_hours"], ["kitchen_overdue", "As of today"], ["kitchen_cost"], ["kitchen_over_recipe", "Against today's recipe costs"], ["kitchen_yield_pct"], ["kitchen_catering_share"]];

export const PURPOSE_CARD = {
  title: "What the batches were for",
  info: { calculation: "The period's finished batches: made for a catering event or regular prep, with their recorded cost.", source: BATCHES },
  tones: { catering: "bg-gold", regular: "bg-navy" },
  empty: "No batches were finished in the period.",
};

export const RECIPE_INFO = { calculation: "Every recipe the period's batches were made from: batches finished, the output recorded, the average yield against the recipe, the recorded cost, and that cost less what the recipe costs today for the planned quantity (red: more than the recipe). Highest cost first.", source: `${BATCHES} ${RECIPES}` };
export const CHEF_INFO = { calculation: "Each person the Head Chef assigned to the period's batches: the batches they were on, the share ready on time and the average prep time. A batch with two people counts for both. Busiest first.", source: BATCHES };
export const OPEN_INFO = { calculation: "Batches not yet finished or cancelled, by their stage on the Head Chef board, with the day each is needed. Overdue first (the needed-by date has passed), then by the day needed.", source: "Head Chef board › production batches of the selected branches, as of today." };

export const LEDGER_CARD = {
  title: "Production vs the ledger",
  label: "Batch cost",
  ledgerLabel: "Posted as production",
  info: { calculation: "The recorded cost of the batches finished in the period beside the production cost inventory accounting posted to the ledger for the same days. Every finished batch posts its own cost, so the two should agree.", source: "Head Chef board › finished batches of the picked company's branches, and Finance › the inventory postings in the company ledger." },
  gapNote: "Some finished batches haven't posted their cost to the ledger. Finance › Reporting › Financial health check shows what isn't posted.",
};