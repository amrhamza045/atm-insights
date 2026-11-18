// What Stock & Waste shows on its cards and tables.
const STOCK = "Inventory › stock items of the selected branches, as of today.";
const WASTE = "Inventory › approved waste declarations of the selected branches, by waste date.";
const TODAY = "As of today";
const NONE = "No waste was declared in the period.";

export const KPIS = [["stock_value", TODAY], ["expiring_value", TODAY], ["expired_value", TODAY], ["low_stock_items", TODAY], ["out_of_stock_items", TODAY], ["waste_value"], ["waste_declarations"], ["waste_pct_purchases"]];

export const REASON_CARD = {
  title: "Waste by reason",
  info: { calculation: "The period's approved waste declarations by the reason given, with their recorded cost.", source: WASTE },
  tones: { expired: "bg-danger-500", spoiled: "bg-warning-400", damaged: "bg-navy", overproduction: "bg-gold", preparation_error: "bg-slate-400", other: "bg-slate-300" },
  empty: NONE,
};

const COLUMNS = [["waste_declarations", "Declarations", "number", "down"], ["waste_value", "Cost", "money", "down"]];
export const ITEM_TABLE = { columns: COLUMNS, empty: NONE, info: { calculation: "Each stock item's approved waste declarations in the period and their recorded cost. Highest cost first.", source: WASTE } };
export const CATEGORY_TABLE = { columns: COLUMNS, empty: NONE, info: { calculation: "The period's waste per stock category. Highest cost first.", source: WASTE } };

export const STOCK_CATEGORY_INFO = { calculation: "What the stock on hand is worth per category: quantity × cost per unit, converted from the unit each cost is kept in.", source: STOCK };
export const WATCH_INFO = { calculation: "Stock items that need attention, in this order: past their expiry date with stock still on hand, expiring within 7 days, at or below their low-stock alert level, and with nothing on hand. Highest value first within each.", source: STOCK };

export const LEDGER_CARD = {
  title: "Stock vs the ledger",
  label: "Stock value",
  ledgerLabel: "Stock accounts in the ledger",
  info: { calculation: "The stock value of this report beside the balance of the stock accounts in the posted ledger (the accounts mapped to inventory in Finance › Mapping Accounts), debits minus credits, up to today.", source: "Inventory › stock items, and Finance › the posted company ledger." },
  gapNote: "The ledger doesn't hold the stock you count. Usually the opening stock was never entered in Finance, or some purchases, returns and waste aren't posted yet. Finance › Reporting › Financial health check shows what isn't posted.",
};