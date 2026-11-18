// What Suppliers shows on its cards and tables.
const INVOICES = "Purchases › purchase invoices posted for the selected branches, by invoice date. Drafts don't count.";

export const KPIS = [["suppliers_used"], ["purchases_value"], ["top_supplier_share"], ["deliveries_received"], ["on_time_rate"], ["avg_lead_days"], ["supplier_rating"], ["supplier_balance", "As of today"]];

export const SPEND_INFO = { calculation: "Purchase invoices posted in the period per supplier, largest first, with each supplier's share of the total and the comparison.", source: INVOICES };

export const PERFORMANCE_INFO = {
  calculation: "Each supplier bought from, delivering, rated or owed money: the period's purchases, the deliveries recorded in the period with the share on time (by the day expected, else needed by) and the average days from order to delivery, the average 1–5 ratings given in the period, and what the supplier accounts show as owed today. Largest purchases first.",
  source: "Purchases › purchase invoices, purchase orders and supplier accounts of the selected branches; Suppliers › ratings on their orders.",
};

export const LEDGER_CARD = {
  title: "Supplier accounts vs the ledger",
  label: "Supplier accounts",
  ledgerLabel: "Supplier payables in the ledger",
  info: { calculation: "What the supplier accounts show as owed beside the balance of the supplier payables accounts in the posted ledger (the account mapped to supplier payables in Finance › Mapping Accounts, or the Suppliers account of Automatic posting), credits minus debits, up to today.", source: "Purchases › supplier accounts, and Finance › the posted company ledger." },
  gapNote: "The supplier accounts and the ledger disagree. Usually a posted invoice was never registered in its supplier's account, or a payment was recorded in only one of them. Each supplier's page shows its account and the invoices registered in it.",
};