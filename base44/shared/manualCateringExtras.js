// Chapter, location, related modules and Finance link of each Catering
// manual module (merged into manualCateringModules by name).

const PAYMENT_POSTING = "Approved catering payments write a posted operational journal to the accounts set for the chosen payment method: deposits, final balances and additional payments = Dr the method's cash or bank account / Cr the customer deposits account; credit notes (refunds) and excess-deposit withdrawals = Dr the customer deposits account / Cr the method's account; a cancellation penalty is kept from what the client already paid = Dr the customer deposits account / Cr the cancellation income account, so no cash moves and the event's total paid and deposit paid go down by the penalty. Voiding a payment writes a reversing journal (debits and credits swapped) against the original. When operational journal posting is enabled in Finance › Automatic posting, each posted operational journal is copied into the company ledger through the GL-to-company account mapping.";

export const CATERING_EXTRAS = {
  "Event Overview & Booking": {
    chapter: "booking",
    nav: "Catering › Booking › Quick Actions, Events, Calendar",
    links: ["Quotes, Packages & Discounts", "Deposits, Payments & Financial Controls", "CRM & Client 360", "Approvals Center"],
    finance: {
      status: "reported",
      summary: "The event is the cost and revenue anchor for everything Finance later sees from catering: its branch is the ledger cost centre, and its quote total, required deposit, total paid and balance due drive every catering payment posting.",
      events: ["Event created / edited: CateringEvent (branch_id, client_id, event_date, quote_total, required_deposit_amount, balance_due) - no posting by itself", "Event cancelled: cancellation_penalty_percentage and cancellation_penalty_amount decide what part of the deposit is retained or refundable", "Event completed: actual_food_cost, actual_labor_cost, actual_equipment_cost, actual_total_cost, actual_revenue and actual_margin are stored on the event"],
      postings: ["None directly. Money posts only through Deposits, Payments & Financial Controls.", "Not built yet: recognising the actual event costs (food, labour, equipment) in the ledger; today they live only on the event and in the Executive Dashboard Event P&L."],
      controls: ["Branch on the event must be right: it becomes the cost centre of every catering journal.", "Cancelling an event does not move money; record the refund, penalty or withdrawal as a catering payment so Finance sees it."],
    },
  },
  "Quotes, Packages & Discounts": {
    chapter: "booking",
    nav: "Catering › Booking › Quotes / Packages / Event Type Discounts",
    links: ["Event Overview & Booking", "Deposits, Payments & Financial Controls", "Food Cost & Recipe Costing", "Menu Management & Engineering"],
    finance: {
      status: "reported",
      summary: "The accepted quote is the contract value Finance should expect: its total, tax and service charge, and its frozen estimated cost and margin are the budget that actual event costs are compared to.",
      events: ["Quote accepted: CateringQuote (total, subtotal, tax_total, service_charge_total, discount_amount, estimated_cost, estimated_margin) becomes the event's active quote and sets quote_total and required_deposit_amount"],
      postings: ["None. Quotes never post; only payments against the event post."],
      controls: ["Line unit_cost must be current (from recipes and purchase prices) or the estimated margin, and the later quote-versus-actual comparison, is wrong.", "Tax- and service-exempt flags on lines change the tax that clients pay; check them before the quote is sent."],
    },
  },
  "Deposits, Payments & Financial Controls": {
    chapter: "booking",
    nav: "Catering › Booking › Deposits & Payments; Operations › Approvals (catering payments, deposit withdrawals)",
    links: ["Finance Workspace (Accounting)", "Financial System (Operational GL)", "Approvals Center", "Event Overview & Booking"],
    finance: {
      status: "posts",
      summary: "This is the catering module with a live Finance connection: every approved payment, credit note and withdrawal writes a balanced operational journal that Finance can post automatically.",
      events: ["Deposit approved: CateringPayment payment_type deposit, status completed", "Final balance / additional / penalty approved: CateringPayment status completed", "Credit note issued: payment_type refund", "Excess deposit withdrawal approved: payment_type deposit_withdrawal", "Payment voided: a reversing journal is written against the original"],
      postings: [PAYMENT_POSTING],
      controls: ["Payments stay pending until approved by someone with catering_payment_approve; only completed payments post.", "Deposits stay in the liability account 2300: nothing moves them to revenue yet, so finance staff should review 2300 per event at closeout.", "Never record a client refund outside this screen: a refund done elsewhere leaves the deposits liability overstated."],
    },
  },
  "Confirm & Start, Planning & Procurement": {
    chapter: "planning",
    nav: "Catering › Planning & Prep › Confirm & Start, Planning, Shortfalls, Recommended Cart",
    links: ["Stock Release Slip Requisitions", "Purchasing & Invoices", "Inventory Management", "Manufacturing & Production"],
    finance: {
      status: "reported",
      summary: "Planning commits stock and raises purchase orders for shortfalls. Purchase orders become purchase invoices, and posted purchase invoices are what Finance records (inventory and supplier payables).",
      events: ["Stock reserved: CateringReservation (quantity_reserved) - no money moves", "Shortfall purchase order approved: PurchaseOrder", "Goods invoiced and posted: PurchaseInvoice status posted"],
      postings: ["Posted purchase invoices (from Purchasing): Dr Inventory / Cr Supplier payables, using Finance › Automatic posting mappings."],
      controls: ["Reservations are commitments, not costs; Finance does not see them.", "Raise shortfall purchases from one pathway (Shortfall Queue or Recommended Cart) to avoid double-ordering."],
    },
  },
  "Stock Release Slip Requisitions": {
    chapter: "planning",
    nav: "Catering › Planning & Prep › Requisitions; Kitchen Display › Requisitions; Inventory Items › Requested Items; Operations › Approvals",
    links: ["Inventory Management", "Kitchen Display System (KDS)", "Approvals Center", "Event Day, Kitchen Execution & Closeout"],
    finance: {
      status: "not_linked",
      summary: "Released batches are the actual stock issued to an event and count as the event's actual food cost. That cost is stored on the event but is not posted to the ledger.",
      events: ["Batch released: KitchenReleaseSlip status released (lines with actual_quantity) - stock leaves inventory", "Extra items above the limit: Requisition approval_status pending, approved by requisition_approve holders"],
      postings: ["Not built yet: stock issued to an event = Dr Catering food cost (cost of sales) / Cr Inventory, valued at the item cost_per_unit at release."],
      controls: ["Uncosted lines (unit differs from the item's cost unit, or no cost) are excluded from estimated totals; fix the item's units and cost so actual food cost is complete.", "The extra-items limit (% of planned food cost) is the main cost control before stock leaves."],
    },
  },
  "Staffing, Equipment, Logistics & Custody": {
    chapter: "planning",
    nav: "Catering › Planning & Prep › Staffing / Equipment / Logistics / Custody",
    links: ["Payroll, Penalties & Borrowings", "Attendance & Geolocation", "Employee & HR Management", "Event Day, Kitchen Execution & Closeout"],
    finance: {
      status: "not_linked",
      summary: "Staff assignments carry pay rates and estimated labour cost; equipment carries usage, damage and missing costs; trips carry transport cost. These feed the event's actual cost but are not posted.",
      events: ["Assignment confirmed: CateringAssignment (rate, expected_hours, estimated_cost)", "Labour cost locked: CateringEvent estimated_labor_cost and labor_cost_breakdown", "Equipment returned: CateringEquipmentReservation (usage_cost, damaged and missing quantities, missing_cost)", "Trip completed: CateringTrip (cost basis, distance, days, extra cost)"],
      postings: ["Not built yet: freelance/temporary event pay = Dr Catering labour cost / Cr Accrued wages or Cash; equipment missing/damage = Dr Equipment loss / Cr Equipment asset; transport = Dr Transport cost / Cr Cash or Payables.", "Regular staff pay reaches Finance only through payroll reporting (SalaryRecord), not per event."],
      controls: ["Rates on assignments must match HR pay data or labour cost per event is wrong.", "Record returned, damaged and missing quantities on every reservation; missing cost uses the replacement cost."],
    },
  },
  "Event Day, Kitchen Execution & Closeout": {
    chapter: "event_day",
    nav: "Catering › Event Day › Execution, Reconciliation, Returns, Reports",
    links: ["Deposits, Payments & Financial Controls", "Executive Dashboard & Business Intelligence", "Stock Release Slip Requisitions", "Waste, Expiry & Selling Priority"],
    finance: {
      status: "reported",
      summary: "Closeout produces the event's actual cost, revenue and margin. These are the figures Finance should reconcile against the posted catering revenue and deposits.",
      events: ["Reconciliation finalised: CateringReconciliation", "Returns recorded: CateringReturnedItem (food returned to stock)", "Manual cost exceptions: CateringCostException (category food/equipment/labor/transport/other, amount)", "Actual costs recomputed: CateringEvent actual_* fields and actual_cost_status (complete / incomplete with warning codes)"],
      postings: ["Revenue and deposits post through catering payments.", "Not built yet: posting actual_total_cost to cost of sales at closeout, and releasing remaining deposits (2300) to revenue (4200) once the event is completed."],
      controls: ["An actual_cost_status of incomplete means part of the cost is missing (no purchase history, no shifts); do not report the margin until it is complete.", "Cost exceptions are voided, never deleted, so the audit trail stays."],
    },
  },
  "Guest Engagement & Customer Portal": {
    chapter: "guests",
    nav: "Catering › Guest Engagement; Catering Portal (client); Event RSVP and Event Pass (guests)",
    links: ["Deposits, Payments & Financial Controls", "Quotes, Packages & Discounts", "Referral Network"],
    finance: {
      status: "reported",
      summary: "Clients see their quote and pay or upload transfer proofs in the portal. Uploaded transfers become pending payments that staff verify; only approved payments post.",
      events: ["Transfer proof uploaded: CateringTransferProof status pending → verified / rejected", "Declared deposit: CateringEvent deposit_declared_amount, method and reference"],
      postings: ["None directly; a verified transfer becomes a catering payment that posts on approval."],
      controls: ["Portal visibility settings change what the client sees, never the amounts posted.", "Verify every transfer reference against the bank before approving."],
    },
  },
  "Catering Settings & Access Control": {
    chapter: "settings",
    nav: "Catering › Settings › Lists & Settings, Payment Policies, Policies, Roles' Catering tabs",
    links: ["Users, Roles & Permissions", "Deposits, Payments & Financial Controls", "Stock Release Slip Requisitions"],
    finance: {
      status: "none",
      summary: "Settings change how catering money is calculated and controlled (deposit %, cancellation tiers, extra-items limit, target margins, payment policies) but write nothing to Finance themselves.",
      events: ["Cancellation policy tiers (penalty %, deposit refundable)", "Extra items limit % (CateringSettings extra_items_limit_percent)", "Target margins (SystemSettings catering_target_margin_percentage)", "Payment policies per booking window (CateringPaymentPolicy: payment steps and approval rule, applied to every new booking and re-applied on reschedule)"],
      postings: ["None."],
      controls: ["Changing a cancellation policy only affects later cancellations.", "Grant catering_finance and catering_payment_approve to finance staff only."],
    },
  },
};