import { fmtMoney, fmtNumber } from "@/components/executive/kit/formatters";
import { cateringUrl } from "@/components/catering/cateringTabs";

// Wording, links and calculation notes for each Alerts Center check (the
// server decides which fire). screen: where the alert is dealt with; itemUrl:
// the record behind one line, when it has its own page.
const count = (n, one, many = `${one}s`) => `${fmtNumber(n)} ${n === 1 ? one : many}`;
const money = (a, w) => fmtMoney(a, w.currency);
const left = (i) => (i.quantity != null ? `${fmtNumber(i.quantity)} ${i.unit || ""}`.trim() : "");

export const ALERTS = {
  events_past_date: {
    area: "Catering", title: (a) => `${count(a.count, "event")} past their date and not closed`,
    why: (a, w) => `Confirmed or in-progress events whose day has passed, worth ${money(a.amount, w)} in quotes. Until they are closed, their actual costs, feedback and reports stay incomplete.`,
    action: "Open each event, record what happened and close it (or cancel it if it never took place).",
    when: "Events confirmed or in progress with an event date before today.", source: "Catering events",
    screen: { url: "/Catering?tab=events", label: "Catering events" }, itemUrl: (i) => cateringUrl("events", i.id), detail: () => "",
  },
  payments_overdue: {
    area: "Catering", title: (a, w) => `${money(a.amount, w)} overdue from ${count(a.count, "client")}`,
    why: () => "Upcoming events that have paid less than their payment policy required by now.",
    action: "Chase the payment or agree a new date with the client.",
    when: "Events still to come whose paid amount is below what their saved payment policy required before today.", source: "Catering events and payments",
    screen: { url: "/Catering?tab=payments", label: "Catering payments" }, itemUrl: (i) => cateringUrl("payments", i.id), detail: (i, w) => `${money(i.amount, w)} due by ${i.due_by}`,
  },
  critical_roles: {
    area: "Catering", title: (a) => `${count(a.count, "event")} in the next 2 weeks missing critical staff`,
    why: (a) => `${count(a.extra, "critical role")} still unfilled.`,
    action: "Assign people to the critical roles, or confirm a freelancer.",
    when: "Booked events in the next 14 days with critical staffing roles unfilled.", source: "Catering staffing",
    screen: { url: "/Catering?tab=staffing", label: "Catering staffing" }, itemUrl: (i) => cateringUrl("staffing", i.id), detail: (i) => count(i.count, "role"),
  },
  stock_shortfalls: {
    area: "Catering", title: (a) => `${count(a.count, "event")} in the next 2 weeks short of stock`,
    why: (a) => `${count(a.extra, "open shortfall")} on these events.`,
    action: "Order the missing items or swap them in the event's planning.",
    when: "Booked events in the next 14 days with open stock shortfalls.", source: "Catering planning",
    screen: { url: "/Catering?tab=shortfalls", label: "Shortfalls" }, itemUrl: (i) => cateringUrl("shortfalls", i.id), detail: (i) => count(i.count, "shortfall"),
  },
  staff_gaps: {
    area: "Catering", title: (a) => `${count(a.extra, "staff slot")} open this week`,
    why: (a) => `${count(a.count, "event")} in the next 7 days have fewer people assigned than needed.`,
    action: "Fill the remaining slots in each event's staffing.",
    when: "Booked events in the next 7 days with fewer staff assigned than required.", source: "Catering staffing",
    screen: { url: "/Catering?tab=staffing", label: "Catering staffing" }, itemUrl: (i) => cateringUrl("staffing", i.id), detail: (i) => `${count(i.count, "slot")} open`,
  },
  payments_to_review: {
    area: "Approvals", title: (a) => `${count(a.count, "catering payment")} waiting for approval`,
    why: () => "Entered payments count towards balances and the ledger only once approved.",
    action: "Review them in the Approvals Center.",
    when: "Catering payments with status pending.", source: "Catering payments",
    screen: { url: "/Approvals", label: "Approvals Center" },
  },
  supplier_overdue: {
    area: "Suppliers", title: (a, w) => `${money(a.amount, w)} overdue to ${count(a.count, "supplier invoice")}`,
    why: () => "Supplier invoices past their due date that are not fully paid.",
    action: "Pay them or agree new terms with the supplier.",
    when: "Posted supplier invoices due before today, less payments and returns against them.", source: "Supplier accounts",
    screen: { url: "/SupplierHub", label: "Supplier accounts" }, detail: (i, w) => `${i.detail ? `${i.detail} · ` : ""}${money(i.amount, w)}`,
  },
  supplier_due_soon: {
    area: "Suppliers", title: (a, w) => `${money(a.amount, w)} due to suppliers this week`,
    why: (a) => `${count(a.count, "invoice")} falling due in the next 7 days.`,
    action: "Plan the payments so the cash is ready.",
    when: "Posted supplier invoices due today to 7 days ahead, less payments and returns against them.", source: "Supplier accounts",
    screen: { url: "/SupplierHub", label: "Supplier accounts" }, detail: (i, w) => `${i.detail ? `${i.detail} · ` : ""}${money(i.amount, w)}`,
  },
  catering_orders_due: {
    area: "Purchasing", title: (a) => `${count(a.count, "event purchase order")} needed within 3 days, not received`,
    why: (a, w) => `Orders raised for catering events, worth ${money(a.amount, w)}, that have not been received yet.`,
    action: "Confirm delivery with the supplier, or buy elsewhere.",
    when: "Open catering purchase orders with no recorded purchase and a needed-by date within 3 days.", source: "Purchase orders",
    screen: { url: "/PurchasesHub?stage=purchase-orders", label: "Purchase orders" }, detail: (i) => i.detail,
  },
  orders_late: {
    area: "Purchasing", title: (a) => `${count(a.count, "purchase order")} past the expected delivery`,
    why: (a, w) => `Open orders worth ${money(a.amount, w)} that should have arrived.`,
    action: "Chase the supplier, or record the purchase if the goods came in.",
    when: "Open purchase orders with no recorded purchase and an expected delivery date before today.", source: "Purchase orders",
    screen: { url: "/PurchasesHub?stage=purchase-orders", label: "Purchase orders" }, detail: (i) => i.detail,
  },
  orders_to_review: {
    area: "Approvals", title: (a) => `${count(a.count, "purchase order")} waiting for review`,
    why: () => "Orders raised or recommended that nobody has approved yet.",
    action: "Approve or reject them so purchasing can go ahead.",
    when: "Purchase orders pending approval or recommended by the catering cart.", source: "Purchase orders",
    screen: { url: "/Approvals", label: "Approvals Center" },
  },
  stock_expired: {
    area: "Stock", title: (a) => `${count(a.count, "stock item")} past expiry`,
    why: (a, w) => `Items still in stock after their expiry date, worth ${money(a.amount, w)}.`,
    action: "Check them and declare the waste so stock and costs stay right.",
    when: "Items with stock on hand and an expiry date before today.", source: "Inventory",
    screen: { url: "/InventoryHub?tab=expiry", label: "Expiry" }, detail: (i) => [i.detail, left(i)].filter(Boolean).join(" · "),
  },
  stock_expiring: {
    area: "Stock", title: (a) => `${count(a.count, "stock item")} expiring this week`,
    why: (a, w) => `Worth ${money(a.amount, w)}.`,
    action: "Use them first in upcoming events or production.",
    when: "Items with stock on hand expiring within 7 days.", source: "Inventory",
    screen: { url: "/InventoryHub?tab=expiry", label: "Expiry" }, detail: (i) => [i.detail, left(i)].filter(Boolean).join(" · "),
  },
  stock_out: {
    area: "Stock", title: (a) => `${count(a.count, "stock item")} out of stock`,
    why: () => "Nothing left on hand.", action: "Reorder the items you still use.",
    when: "Items with no stock on hand.", source: "Inventory",
    screen: { url: "/InventoryHub", label: "Inventory" }, detail: (i) => i.detail,
  },
  stock_low: {
    area: "Stock", title: (a) => `${count(a.count, "stock item")} below the low-stock level`,
    why: () => "Stock on hand is at or under the level set on the item.", action: "Reorder before they run out.",
    when: "Items whose stock on hand is at or below their low-stock threshold.", source: "Inventory",
    screen: { url: "/InventoryHub", label: "Inventory" }, detail: (i) => [i.detail, left(i)].filter(Boolean).join(" · "),
  },
  followups_overdue: {
    area: "Clients", title: (a) => `${count(a.count, "client follow-up")} overdue`,
    why: () => "Follow-ups promised to clients whose date has passed.", action: "Contact the clients and mark the follow-ups done.",
    when: "Client notes with a follow-up date before today that is not marked done (whole business).", source: "CRM",
    screen: { url: "/CRM", label: "CRM" }, detail: (i) => i.detail,
  },
  leads_waiting: {
    area: "Clients", title: (a) => `${count(a.count, "new lead")} waiting over 2 days`,
    why: () => "Leads nobody has contacted yet. The longer they wait, the fewer book.", action: "Contact them and move them on in the pipeline.",
    when: "Leads still at New that came in more than 48 hours ago (whole business).", source: "CRM leads",
    screen: { url: "/CRM", label: "CRM" }, detail: (i) => i.detail,
  },
  posting_issues: {
    area: "Finance", title: (a) => `${count(a.count, "transaction")} not posted to the ledger`,
    why: () => "Automatic posting stopped on these, so the ledger and finance reports leave them out.",
    action: "Fix the account mapping or the record, then post again.",
    when: "Open finance posting issues.", source: "Finance automatic posting",
    screen: { url: "/Finance?tab=automatic", label: "Automatic posting" },
  },
};