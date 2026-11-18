// The Cost & supply figures of the Executive Dashboard (part of METRICS):
// label, calculation, source, format and which way is better.
const STOCK = "Inventory › stock items of the selected branches: quantity on hand × cost per unit, converted from the unit each cost is kept in.";
const WASTE = "Inventory › approved waste declarations of the selected branches, by waste date.";
const INVOICES = "Purchases › purchase invoices posted for the selected branches, by invoice date. Drafts don't count.";
const RETURNS = "Purchases › Supplier accounts: goods returned to suppliers by the selected branches (posted returns), by return date.";
const ORDERS = "Purchases › purchase orders of the selected branches, by order date. Cancelled orders don't count.";
const OPEN = "Purchases › purchase orders of the selected branches not yet bought or cancelled.";
const RECEIVED = "Purchases › purchase orders of the selected branches whose real purchase was recorded in the period.";
const REVIEWS = "Suppliers › ratings given to suppliers in the period on their orders.";
const ACCOUNTS = "Purchases › Supplier accounts of the selected branches: posted invoices, payments, returns and opening balances.";
const DISHES = "Catering › menu dishes on the active quotes of the delivered events of the selected branches (status Completed, by event date), as quoted.";
const MENU = "Menu › available dishes with a price and a recipe, costed at today's stock costs.";
const TODAY = "A snapshot as of today, so it doesn't follow the period.";
const POINTS = "Changes are shown in percentage points.";

const money = (label, goodWhen, calculation, source, note) => ({ label, format: "money", goodWhen, calculation, source, note });
const count = (label, goodWhen, calculation, source, note) => ({ label, format: "number", goodWhen, calculation, source, note });
const share = (label, goodWhen, calculation, source, note = POINTS) => ({ label, format: "percent", goodWhen, calculation, source, note });

export const SUPPLY_METRICS = {
  stock_value: money("Stock value", "none", "Every stock item's quantity on hand × its cost per unit, converted from the unit the cost is kept in (for example a cost per kg for stock counted in g).", STOCK, TODAY),
  expiring_value: money("Expiring within a week", "down", "Value of the stock whose expiry date falls in the next 7 days.", STOCK, TODAY),
  expired_value: money("Expired, still on hand", "down", "Value of the stock past its expiry date that is still counted on hand.", STOCK, TODAY),
  low_stock_items: count("Low stock", "down", "Items in stock at or below their low-stock alert level.", STOCK, TODAY),
  out_of_stock_items: count("Out of stock", "down", "Stock items with nothing on hand.", STOCK, TODAY),
  waste_value: money("Waste cost", "down", "Cost recorded on the approved waste declarations of the period.", WASTE),
  waste_declarations: count("Waste declarations", "down", "Approved waste declarations of the period.", WASTE),
  waste_pct_purchases: share("Waste % of purchases", "down", "Waste cost ÷ the period's purchases (invoices posted less goods returned to suppliers) × 100.", `${WASTE} ${INVOICES} ${RETURNS}`),

  purchases_value: money("Purchases", "none", "Totals of the purchase invoices posted in the period, less the goods returned to suppliers in the period.", `${INVOICES} ${RETURNS}`),
  invoices_posted: count("Invoices posted", "none", "Purchase invoices posted in the period.", INVOICES),
  orders_raised: count("Orders raised", "none", "Purchase orders dated in the period.", ORDERS),
  orders_value: money("Value ordered", "none", "Totals of the purchase orders dated in the period.", ORDERS),
  catering_order_share: share("Ordered for catering", "none", "Value ordered for catering events ÷ value ordered × 100.", ORDERS),
  urgent_orders: count("Urgent orders", "down", "Orders dated in the period flagged urgent because they were blocking an imminent catering event.", ORDERS),
  price_change_impact: money("Price change effect", "down", "For each item bought in both periods in the same unit, after goods returned: (this period's average price − the comparison's) × this period's quantity, added up. Above zero means price rises cost that much more.", `${INVOICES} ${RETURNS}`, "It compares the two periods' prices, so it has no change of its own."),
  open_orders_value: money("Open orders", "none", "Value of the purchase orders not yet bought or cancelled.", OPEN, TODAY),

  suppliers_used: count("Suppliers used", "none", "Suppliers with purchases in the period, after the goods returned to them.", `${INVOICES} ${RETURNS}`),
  top_supplier_share: share("Top supplier's share", "down", "Purchases from the largest supplier ÷ all purchases of the period × 100, both after goods returned. A high share means more depends on one supplier.", `${INVOICES} ${RETURNS}`),
  deliveries_received: count("Deliveries received", "none", "Orders whose real purchase was recorded in the period.", RECEIVED),
  on_time_rate: share("On time", "up", "Deliveries recorded by the day they were expected (else needed by) ÷ the deliveries with such a day × 100.", RECEIVED),
  avg_lead_days: { label: "Lead time (days)", format: "number", goodWhen: "down", calculation: "Days from each order's date to the day its purchase was recorded, averaged.", source: RECEIVED },
  supplier_rating: { label: "Supplier rating", format: "rating", goodWhen: "up", calculation: "Average of the 1–5 overall ratings given to suppliers in the period.", source: REVIEWS, note: "Changes are shown in points." },
  supplier_balance: money("Owed to suppliers", "down", "What the supplier accounts show as owed: posted invoices less payments and returns, opening balances included.", ACCOUNTS, TODAY),

  dishes_served: count("Dishes served", "none", "Different menu dishes on the period's delivered events.", DISHES),
  dish_revenue: money("Dish revenue", "up", "Line totals of the menu dishes on the delivered events' quotes, after line discounts. Quote-wide discounts, tax and service aren't spread over the dishes.", DISHES),
  dish_margin: money("Dish margin", "up", "Dish revenue minus the dishes' cost as quoted.", DISHES),
  dish_margin_pct: share("Dish margin %", "up", "Dish margin ÷ dish revenue × 100.", DISHES),
  cost_drift: money("Cost at today's prices", "down", "What the period's dish portions would cost at today's recipe costs, less their cost as quoted. Above zero means the same dishes cost more today. Dishes without a costed recipe are left out.", `${DISHES} ${MENU}`, "It compares with today's costs, so it has no change of its own."),
  menu_food_cost_pct: { label: "Menu food cost", format: "percent", goodWhen: "down", calculation: "Average food cost of the menu's dishes: today's recipe cost ÷ price × 100.", source: MENU, note: TODAY },
  menu_below_target: count("Below target margin", "down", "Dishes whose margin at today's recipe cost is below the dish's own target margin. Dishes without a target don't count.", MENU, TODAY),
  menu_without_recipe: count("Dishes without a recipe", "down", "Available dishes with a price but no recipe, so their food cost is unknown.", "Menu › available dishes of the selected branches (and those shared by all).", TODAY),
};