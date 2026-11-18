// Single source of truth: which permission unlocks each Approvals queue.
export const APPROVAL_QUEUE_KEYS = {
  expenses: "expense_approve",
  expenseDisbursements: "expense_approve",
  custodyRequests: "custody_approve",
  purchases: "cashier_purchase_approve",
  payouts: "payouts_approve",
  recharges: "recharge_approve",
  withdrawals: "deposit_withdrawal_approve",
  cateringPayments: "catering_payment_approve",
  registrations: "registrations_approve",
  upgrades: "level_upgrade_approve",
  redemptions: "redemptions_approve",
  returns: "return_approve",
  cashback: "cashback_dist_approve",
  pos: "purchase_approve",
  cateringPos: "purchase_approve",
  waste: "waste_approve",
  expiry: "expiry_manage",
  events: "catering_reservation_approve",
  bookings: "catering_booking_approve",
  cateringQuotes: "catering_quote_approve",
  custody: "catering_approve",
  requisitions: "requisition_approve",
  attendance: "hr_attendance_approve",
  bonuses: "delivery_bonus_approve",
  sessions: "cashier_session_approve",
  reviews: "review_moderate",
};

// Card type (used by the generic approval card) → queue id.
export const TYPE_TO_QUEUE = {
  expense: "expenses", purchase: "purchases", payout: "payouts",
  recharge: "recharges", registration: "registrations", levelUpgrade: "upgrades", redemption: "redemptions",
  return: "returns", cashbackDistribution: "cashback", purchaseOrder: "pos", waste: "waste",
};

export const ALL_APPROVAL_KEYS = [...new Set([...Object.values(APPROVAL_QUEUE_KEYS), "catering_finance"])];

// Shown in Role Management / User Management, grouped like the Approvals bands.
export const APPROVAL_PERMISSION_GROUPS = [
  { title: "Approvals — Money & Finance", color: "emerald", items: [
    { key: "expense_approve", label: "Expenses & Vendor Disbursements" },
    { key: "custody_approve", label: "Petty Cash & Custody Requests / Settlements" },
    { key: "cashier_purchase_approve", label: "Cashier Purchases" },
    { key: "payouts_approve", label: "Payout Requests" },
    { key: "recharge_approve", label: "Balance Recharges" },
    { key: "deposit_withdrawal_approve", label: "Catering Deposit Withdrawals" },
    { key: "catering_payment_approve", label: "Catering Payment Approval" },
  ] },
  { title: "Approvals — Clients & Loyalty", color: "blue", items: [
    { key: "registrations_approve", label: "Client Registrations" },
    { key: "level_upgrade_approve", label: "Level Upgrades" },
    { key: "redemptions_approve", label: "Reward Redemptions" },
    { key: "return_approve", label: "Order Returns" },
    { key: "cashback_dist_approve", label: "Cashback Distributions" },
  ] },
  { title: "Approvals — Purchasing & Stock", color: "orange", items: [
    { key: "purchase_approve", label: "Purchase Orders (incl. Catering POs)" },
    { key: "waste_approve", label: "Waste Declarations" },
    { key: "expiry_manage", label: "Expiry Reports" },
  ] },
  { title: "Approvals — Catering", color: "amber", items: [
    { key: "catering_reservation_approve", label: "Reservation Approval (approve & reserve / send back)" },
    { key: "catering_approve", label: "Custody Shortages" },
    { key: "catering_quote_approve", label: "Quote Approvals" },
    { key: "catering_booking_approve", label: "Booking Approvals (payment policies)", description: "Approve or reject bookings a payment policy sends for approval, for the policies that name this role as the approver." },
    { key: "requisition_approve", label: "Over-Allowance Requisitions (CEO / Executive Approval)" },
  ] },
  { title: "Approvals — People & Operations", color: "violet", items: [
    { key: "hr_attendance_approve", label: "Attendance" },
    { key: "delivery_bonus_approve", label: "Delivery Bonuses" },
    { key: "cashier_session_approve", label: "Cashier Sessions" },
    { key: "review_moderate", label: "Customer Reviews" },
  ] },
  { title: "Approvals — Self-approval", color: "rose", items: [
    { key: "approval_self_bypass", label: "Self-approve (skip second approver)", description: "Lets this role approve its own requests wherever a second person is normally required: finance configurations and journals, quote revisions, catering payments, withdrawals, cancellations and credit notes, closing events, manual attendance and salary advances. The area's own approval permission is still needed. Admins only get this when their role has it ticked. Every self-approval is written to the audit log." },
  ] },
];