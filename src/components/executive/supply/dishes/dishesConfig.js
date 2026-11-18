// What Dish Performance shows on its cards and tables.
const DISHES = "Catering › menu dishes on the active quotes of the delivered events of the selected branches (status Completed, by event date), as quoted.";
const MENU = "Menu › available dishes with a price and a recipe of the selected branches (and those shared by all), costed at today's stock costs.";

export const KPIS = [["dishes_served"], ["dish_revenue"], ["dish_margin"], ["dish_margin_pct"], ["cost_drift", "Against today's recipe costs"], ["menu_food_cost_pct", "As of today"], ["menu_below_target", "As of today"], ["menu_without_recipe", "As of today"]];

export const CLASSES = {
  star: { hint: "Popular and profitable: keep them prominent.", tone: "bg-success-50 text-success-700" },
  plowhorse: { hint: "Popular with a lower margin: review the price or the recipe cost.", tone: "bg-warning-50 text-warning-800" },
  puzzle: { hint: "Profitable but chosen less: offer them more.", tone: "bg-cream text-navy" },
  dog: { hint: "Neither popular nor profitable: rework or retire.", tone: "bg-danger-50 text-danger-700" },
};

export const MATRIX_INFO = { calculation: "The period's dishes by how often they were chosen and how much they earned. Popular: on at least 70% of the average number of events per dish. Profitable: a margin % at least that of all the period's dishes together. Revenue is each group's dish revenue.", source: DISHES };
export const DISHES_INFO = { calculation: "Each dish of the period: its group, the events it was on, its revenue with the change, its margin % as quoted, and what its portions would cost more (or less) at today's recipe costs. Highest revenue first.", source: `${DISHES} ${MENU}` };
export const MENU_INFO = { calculation: "Every dish of the menu with a price and a recipe: today's cost of one portion (its ingredients at the stock items' current costs), food cost (cost ÷ price × 100) and the dish's own target margin. Highest food cost first.", source: MENU };