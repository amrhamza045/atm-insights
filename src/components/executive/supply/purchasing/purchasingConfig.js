// What Purchasing shows on its cards and tables.
const INVOICES = "Purchases › purchase invoices posted for the selected branches, by invoice date. Drafts don't count.";
const ORDERS = "Purchases › purchase orders of the selected branches, by order date. Cancelled orders don't count.";

export const KPIS = [["purchases_value"], ["invoices_posted"], ["orders_raised"], ["orders_value"], ["catering_order_share"], ["urgent_orders"], ["price_change_impact", "Prices against the comparison"], ["open_orders_value", "As of today"]];

export const SOURCE_CARD = {
  title: "What the orders were for",
  info: { calculation: "The period's purchase orders: raised for catering events (from the recommended cart or an event's shortfalls) or regular purchasing, with their value.", source: ORDERS },
  tones: { catering: "bg-gold", regular: "bg-navy" },
  empty: "No purchase orders were raised in the period.",
};

export const CATEGORY_TABLE = {
  columns: [["purchases_value", "Purchases", "money", "none"], ["items_bought", "Items", "number", "none"]],
  info: { calculation: "The lines of the period's posted purchase invoices per stock category: what was spent and on how many different items. Largest first.", source: INVOICES },
  empty: "No purchase invoices were posted in the period.",
};

export const PRICE_INFO = { calculation: "Items bought in both periods in the same unit: the average price paid per unit (spend ÷ quantity) in each, the change, and its effect: the change × this period's quantity. Largest effect first; red means paying more.", source: INVOICES };
export const OPEN_INFO = { calculation: "Purchase orders not yet bought or cancelled, by stage, with the day each is due (expected delivery, else needed by). Overdue first, then urgent, then by the day due.", source: "Purchases › purchase orders of the selected branches, as of today." };