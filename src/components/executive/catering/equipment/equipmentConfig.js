// What Equipment & Returns shows on its cards and tables.
const EQUIPMENT = "Catering › equipment booked for the confirmed, in-progress and delivered events of the selected branches (released bookings don't count) and their damage records.";
const RETURNS = "Catering › food and drink logged back after the confirmed, in-progress and delivered events of the selected branches.";

export const KPIS = ["equipment_events", "pieces_booked", "usage_cost", "damaged_missing", "damage_loss_cost", "returned_value", "back_to_stock_value", "wasted_value"];

export const DISPOSITION_CARD = {
  title: "What became of the returns",
  info: { calculation: "Items logged back after the period's events by what was done with them, with their recorded value (quantity × the unit cost entered when each was logged).", source: RETURNS },
  tones: { returned_to_stock: "bg-success-500", staff_meal: "bg-navy", wasted: "bg-danger-500", pending: "bg-warning-400" },
  empty: "Nothing was logged back after the period's events.",
};

export const ITEM_TABLE = {
  columns: [["equipment_events", "Events", "number", "none"], ["pieces_booked", "Pieces", "number", "none"], ["usage_cost", "Usage cost", "money", "down"], ["damaged_missing", "Damaged or missing", "number", "down"], ["damage_loss_cost", "Damage & loss", "money", "down"]],
  info: { calculation: "Each catalog item booked for the period's events: the events it went to, pieces booked, usage cost (pieces × the usage cost per event), pieces damaged or missing, and the repair and replacement cost charged for it. Most pieces first.", source: EQUIPMENT },
  empty: "No equipment booked for the period's events.",
};

export const CATEGORY_TABLE = {
  columns: [["items", "Items", "number", "none"], ["returned_value", "Value", "money", "none"], ["back_to_stock_value", "Back to stock", "money", "up"], ["wasted_value", "Wasted", "money", "down"]],
  info: { calculation: "Items logged back after the period's events per category, with their recorded value, the value put back in stock and the value thrown away.", source: RETURNS },
  empty: "Nothing was logged back after the period's events.",
};

export const RETURNS_INFO = { calculation: "Every item logged back after the period's events, newest event first. Narrow by category, what was done with it, condition, event or a search.", source: RETURNS };