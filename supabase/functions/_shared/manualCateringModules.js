// Catering modules of the VeraKit360 manual (category "Catering").
// generateVeraKit360Manual places them right after the first Operations
// modules. Each one is `solo`: manualSoloModule writes it section by section
// so it comes out in full detail. Keep these facts in step with the Catering
// screens whenever they change.

import { mod } from './manualStructure.js';
import { CATERING_EXTRAS } from './manualCateringExtras.js';

const catering = (module) => {
  const { chapter, ...extras } = CATERING_EXTRAS[module.name];
  return mod("catering", chapter, { ...module, ...extras });
};

export const CATERING_MODULES = [
  catering({
    name: "Event Overview & Booking",
    screens: [
      "Catering page layout: five parent tabs (Booking, Planning & Prep, Event Day, Guest Engagement, Settings), each with a row of sub-tabs. Selecting an event scopes every event-level tab to it and shows a 'Scoped to' badge. With no event selected, Quotes, Deposits & Payments, Confirm & Start, Planning, Staffing, Logistics (every trip), Execution, Returned, Reconciliation and Invitations › Guests (every invited guest) list every event's records in the selected branch (filters, 50 rows at a time with Load more, and an Open event button per row); every one of these lists starts on Upcoming events (today first), with Past and All dates one click away, and older events load only when asked for (the same choice sits on Events next to Today, This week and This month, and on Calendar, Stock Release Slip Requisitions, Shortfall Queue, Discounts › By event, Staff Feedback and the Quick Actions events overview); Deposits & Payments adds totals received, refunded & withdrawn and awaiting approval; Reconciliation adds completed events that have no reconciliation yet; and in Confirm & Start, opening a confirmed event (Open & start) starts its operations automatically. The path bar above the page (Back, Forward, Recent locations and the breadcrumb Catering › tab › event) steps through the screens opened in this session.",
      "Booking › Quick Actions: the first Booking sub-tab (leftmost in English, rightmost in Arabic) with one-click shortcuts: New Event (opens Events with the New Event form already open), Calendar, Quotes, Deposits and Staffing (these open for the selected event) and Pending Tasks (opens the Approvals Center). A shortcut only appears when the user may open its screen.",
      "Booking › Events: the event register with a search across all event details, filters, sort order and date range; event cards with Edit, Cancel and Delete in a fixed footer; click a card to select the event.",
      "New / Edit Event form: Client (required), Event name, Event type (required, from the Event Types list), Event date (required), Start and End time, Expected guests (required), Guaranteed guests, Guarantee cutoff, Location (On-site at the branch, or Off-site with venue name, address and Pick location on map), Indoor / Outdoor / Mixed, Theme, Service style (buffet, plated, live stations…), Dress code, Decoration requirements, Event-day contact name and phone, Special requests visible to planning & kitchen (category dietary, allergy, accessibility, beverage or other; guest reference; guest count; kitchen-critical flag) and Notes. The form shows the payment policy the date falls under (its payment steps and approval rule); a date no active policy covers can't be booked. Deposit % shows only on events booked before payment policies applied.",
      "Cancel event dialog: records the reason and applies the event's cancellation policy: the tier for the notice given (minimum days before the event) sets the penalty % and whether the deposit is refundable. The penalty amount, who cancelled and when are stored on the event.",
      "Booking › Calendar: calendar of scheduled catering events for capacity planning; open any event from it."
    ],
    workflows: [
      "Event status lifecycle: enquiry → quoted → deposit_pending → deposit_pending_verification (the customer declared a transfer that staff must verify) → confirmed → in_progress → completed. An event can be cancelled at any stage. The status drives the next step.",
      "Booking a new event end to end: Quick Actions › New Event → fill the form (it shows the payment policy for the date) → Book event (refused when no active payment policy covers the date) → select the event → Quotes (build and share the quote) → the customer approves it (Customer Portal or staff) → Deposits & Payments (the policy's first payment recorded or verified, then approved) → when the policy asks for it, the booking is approved in Approvals › Booking Approvals → status confirmed → Confirm & Start → Planning & Prep.",
      "Guest numbers: expected guests drive planning; guaranteed guests (locked once the guarantee cutoff passes) are the billing floor in Reconciliation and the count requirements scale against once locked.",
      "Rescheduling: changing the event date keeps a reschedule history (previous date, new date, who, when, reason) and re-applies the payment policy for the new date; due dates then count from the reschedule day."
    ],
    features: [
      "Quick Actions shortcuts to the most used catering screens, filtered by the user's access",
      "Complete event brief in one record: venue with map pin, timings, guests, service style, theme, dress code, decorations, event-day contact and kitchen-critical special requests",
      "Event-scoped navigation: select an event once and every tab follows it",
      "Tiered cancellation policies with penalties and deposit refundability",
      "Branch-scoped access: staff assigned to a branch see only that branch's events",
      "The open event and the branch picked at the top always agree: opening an event of another branch (from a link, the Approvals centre or another screen) moves the picker to that branch, and picking another branch closes the open event. Quotes, stock reservations, production batches and catering purchase orders made for an event always belong to the event's own branch, wherever they are started. The Shortfall Queue, like the other event lists, shows the picked branch only",
      "Each branch plans its events from its own stock: planning finds every recipe and package item (sub-recipe ingredients included) in the event's branch, either a copy made from it or the one item there with the same name, and reserves, releases, cooks and buys that branch's own stock. Items the branch doesn't stock yet are added to its stock list when the event is planned, with none on hand (same name, category, units, cost, supplier, lead time and low-stock level), so they show as shortfalls to buy for that branch. The Recommended Cart, kitchen purchase requests and production batches use the same branch items. Events planned before this keep the items they were planned with until their reservation is recalculated",
      "Event codes reused in requisition numbers (REQ-<event code>) and an audit trail of changes"
    ],
    access: [
      "View Catering Module (catering_view): open Catering and see events (branch-scoped)",
      "Create / Edit Events, Quotes & Packages (catering_edit): create, edit, cancel and delete events; needed for the New Event shortcut",
      "Approve Stock Reservations & Close Events (catering_approve): close events",
      "Administrators can hide any Catering parent tab or sub-tab per role (Role Management › Catering tab access)"
    ],
    entities: [
      { name: "CateringEvent", description: "The event: branch, event code, client, event name and type, date, start/end time, location type (on_site/off_site), venue name, address, setting and coordinates, theme, decorations, service style, dress code, special requests (category, detail, guest reference, guest count, kitchen_critical), event-day contact, expected and guaranteed guests, guarantee cutoff and lock, status, active quote and quote total, deposit % / required / paid, total paid, balance due, deposit status, reservation, procurement, production and staffing statuses, cancellation fields (policy, date, by, reason, penalty % and amount), reschedule history" },
      { name: "Client", description: "The customer the event is booked for (name, phone, email, credit limit used by the quote credit check)" },
      { name: "CateringCancellationPolicy", description: "Cancellation policies (name, default, active) with tiers: min_days_before, penalty_percentage, deposit_refundable" },
      { name: "CateringOption", description: "Lists used by the event and package forms: event types, service styles, dress codes, package categories" },
      { name: "Branch", description: "Branch that owns the event; on-site events take place there" }
    ]
  }),
  catering({
    name: "Quotes, Packages & Discounts",
    screens: [
      "Booking › Quotes (selected event): the event's quote revisions with status (active, superseded, accepted, rejected, pending_approval), revision number, totals and a 'Credit overridden' badge; create a quote, edit it, duplicate it into a new revision and open its documents.",
      "Quote form: choose a catalog package (package picker), a one-off package, or build manually; Package description shown on the quotation (inclusions, menu highlights, service details); Variant / tier label (Premium, Economy…); line items with Menu item (a menu line can't be saved without one) or a bespoke custom item, Cost category (Food or Other), Qty / persons, Unit price, unit cost, line discount (% or amount), a kitchen note shown on the KDS, tax-exempt and service-exempt toggles (per line or in bulk) and 'manually sourced' (left out of planning, reservations and gap warnings); Tax %, Service %, quote Discount, Minimum total (net funds retained), Subtotal, Line discounts (included in subtotal), Total and Est. cost / margin; valid-until date; notes. Menu lines without a recipe show a note on the line.",
      "Credit check: the client's credit exposure is compared with their credit limit. A failing quote shows 'An Admin must override this to proceed'; the override, with snapshots of the exposure and the limit, is stored on the quote.",
      "Quotation documents: PDF in English or Arabic (language dialog) with the transparent brand logo; send by email or WhatsApp; Quote settings can collapse each package's recipe lines into a single line.",
      "Booking › Discounts (administrators and users with catering_edit or catering_finance): 'By event' shows the selected event's discounts; 'By event type' manages standing discounts per event type (percent or amount, optional target margin %, active switch, reason, last applied date and count).",
      "Settings › Packages & Media › Packages: catalog packages with name, description, package category, branch, pricing mode (itemized, per guest or flat), base price per guest or flat price, minimum guests, target margin %, line items (menu item or custom; food or other; per-guest or fixed quantity), extra items, equipment requirements and material requirements (flat or per-guest scaling), active flag, times used and last used.",
      "Settings › Packages & Media › Photo & Video: photographer and videographer vendors with tier (budget, mid-range, premium), price basis (per event, hour or day), price, coverage hours, deliverables and contacts.",
      "Settings › Quote: what customers see in the portal and on documents: show line items, quantities, line prices, charge breakdown, service costs, payment history, balance due and per-guest price; hide the discount; 'starting from' price only; package name and total only; keep internal notes hidden; where hidden charges are absorbed (spread into lines, folded into the subtotal, or total only); custom labels for subtotal, service charge, tax and total; round the customer total to a multiple. A per-event override can replace these settings for one event."
    ],
    workflows: [
      "Quote revisions: a new revision supersedes the previous active quote. The active quote is what planning, reservations, deposits and the portal use (required deposit = quote total × deposit %).",
      "Duplicated revision approval: duplicating a quote creates a pending_approval revision that waits in Approvals Center › Catering › Quote Revisions; once approved it replaces the active quote.",
      "Customer decision: the customer approves or declines in the Customer Portal; the decision date and total are frozen and staff acknowledge the response.",
      "Costing and margin: each line freezes its unit cost, so estimated cost, estimated margin and margin % are fixed at quote time. The target margin comes from the package, else the event type, else the catering default, else the restaurant default.",
      "Event-type discounts: active rules apply to quotes of that event type; Discounts › By event shows what was applied to the selected event."
    ],
    features: [
      "Revision history: every change is a new revision; nothing a customer saw is overwritten",
      "Reusable catalog packages with per-guest, flat or itemized pricing and minimum guests",
      "Line-level and quote-level discounts, tax and service exemptions",
      "Kitchen notes travel from the quote line to the KDS",
      "Credit control with an audited admin override",
      "Frozen cost and margin per quote for reliable profitability tracking",
      "Bilingual (English/Arabic) quotation PDFs sent by email or WhatsApp",
      "Full control of what the customer sees: hidden charges, labels, rounding, package-only and starting-from modes",
      "Standing event-type discounts with target margins",
      "Photo & video vendor directory for event add-ons"
    ],
    access: [
      "Create / Edit Events, Quotes & Packages (catering_edit): create and edit quotes and packages",
      "Quote Approvals (catering_quote_approve): approve duplicated revisions in the Approvals Center",
      "Discounts tab: administrators and users with catering_edit or catering_finance",
      "Edit Catering Settings (catering_settings_edit): save the Quote visibility settings"
    ],
    entities: [
      { name: "CateringQuote", description: "Quote revision: revision number, status, package (id, name, category, source manual/catalog_package/one_off_package, description, variant label), guests at quote, line items (item type, cost category, menu item, name, kitchen note, quantity, unit price, unit cost, discount value/mode/amount, line total, line cost, tax_exempt, service_exempt, manually_sourced), subtotal, line discount total, tax and service rates and totals, quote discount, total, estimated cost / margin / margin %, deposit % and required deposit, credit check status and snapshots, valid until, customer decision date and total, staff acknowledgement" },
      { name: "CateringPackage", description: "Catalog package: pricing mode, base price per guest or flat price, minimum guests, target margin %, line items, extra items, equipment and material requirements (flat or per_guest scaling), active, times used" },
      { name: "CateringEventTypeDiscount", description: "Standing discount per event type: mode (percent/amount), value, target margin %, active, reason, last applied date and count" },
      { name: "CateringMediaVendor", description: "Photographer / videographer vendors: service type, tier, price basis, price, coverage hours, deliverables, contacts" },
      { name: "CateringSettings", description: "Customer-facing quote settings: portal_* visibility flags, hidden charge allocation, labels, rounding, starting-from and package-only modes, hide discount, hide internal notes, collapse recipe lines on documents" },
      { name: "CateringPortalQuoteOverride", description: "Per-event override of the customer-facing quote settings" },
      { name: "MenuItem", description: "Menu items used on quote lines; their recipes drive planning" }
    ]
  }),
  catering({
    name: "Deposits, Payments & Financial Controls",
    screens: [
      "Booking › Deposits & Payments (selected event): the event's payment ledger showing type (deposit, final balance, additional, refund, penalty, deposit withdrawal), method (cash, card, bank transfer, InstaPay, wallet), amount, date, reference, status (pending approval, completed, refunded, voided, rejected), receipt or proof (View proof) and who recorded it; 'Submit Catering Payment for Approval' adds a payment (for a deposit, the Amount starts at what the event's payment policy still needs for its first payment, the required deposit minus the deposits already paid, and can't go below it; the 'Percentage of quote total' box shows the matching percentage, and raising it raises the minimum; the amount can be typed higher, up to the outstanding balance; a pending deposit can't later be edited below its minimum or below what the policy still needs); Void (with a reason); a cancellation penalty is kept from what the client has already paid, so it can't exceed the total paid, it lowers the total paid and the deposit paid (one that takes the deposit below the required deposit needs the same confirmation as a refund) and no cash moves; plus the event's required deposit, deposit paid, total paid, balance due and deposit status (none, partial, paid, retained, refundable, refunded).",
      "Customer-declared deposit banner: when the customer declares a transfer in the portal, 'Customer says the deposit was sent — verify before recording' shows the declared method, reference, date and amount. The event stays deposit_pending_verification until staff verify it.",
      "Transfer proofs: screenshots the customer uploads (deposit or full amount, amount, method, reference, transfer date) are reviewed from pending to verified or rejected, with a review note.",
      "Deposit floor warning: when a deposit is below the required deposit, Finance users see a warning and must tick a confirmation checkbox before continuing (warn, don't block).",
      "Credit notes: reduce what the client owes on an event, with a reason (Issue Credit Notes permission).",
      "Approvals Center › Money & Finance: Catering Payments (approve or reject pending catering payments) and Deposit Withdrawals (approve returning a retained or refundable deposit).",
      "Payment policy card (events booked under a payment policy): the policy's name and when it was applied, each payment step with its due date and the total that must be paid by then, marked Paid, Due today, Overdue or Upcoming, and a 'Blocked by the payment policy' box while the booking is on hold, wasn't approved or a payment is overdue.",
      "Approvals Center › Catering › Booking Approvals: bookings a payment policy sends for approval, listed for holders of Booking Approvals (catering_booking_approve) whose role the policy names; Approve confirms the event when its first payment is already in, Reject needs a reason.",
      "Finance workspace: approved catering payments post to the general ledger automatically.",
      "Payment policies (Settings › Payment Policies, see Catering Settings & Access Control): every new event is booked under the active policy for its booking window and keeps a copy of it. The policy's first payment is the required deposit; later payments fall due on their dates, and the Payments tab shows each payment as paid, due or overdue. A booking that needs approval goes to Approvals › Booking Approvals for the approver role; while it is on hold or not approved the event can't be confirmed. While a booking is on hold, not approved or behind on a payment, Confirm & Start and stock release are refused. Rescheduling re-applies the policy for the new date. Events booked before payment policies applied keep their Deposit %."
    ],
    workflows: [
      "Deposit to confirmation: the required deposit is the payment policy's first payment on the active quote (deposit % × quote total on events booked before payment policies) → the customer pays, or declares the transfer in the portal → staff submit the payment for approval → an approver approves it in the Approvals Center → deposit status becomes partial or paid → the event is confirmed (a booking its payment policy holds for approval is confirmed when the approver approves it) and Confirm & Start can begin; the Head Chef receives the event's kitchen brief (it never includes prices).",
      "Payment policy gates: Confirm & Start and stock release are refused while the booking is on approval hold, wasn't approved, or the total paid is below what the policy required by a past due date; a deposit withdrawal can't take out money a payment step already requires.",
      "Payment approval: submitted payments stay pending until approved. Reviews of one event are serialized by a payment review lock, so two approvers can't post the same event twice. Approved payments update the event totals and post to Finance; rejected payments keep the reason; voided payments keep who, when and why.",
      "Auto-approval (Admin approval settings): when switched on, a request is auto-approved if its requester already holds the matching approval permission; requests that need an independent approver always stay pending.",
      "Cancellation money: the cancellation policy tier for the notice given sets the penalty % and whether the deposit is refundable; the deposit becomes retained, refundable or refunded. A refundable deposit is returned through a deposit withdrawal approved in the Approvals Center.",
      "Overpayments: a credit note can't be voided while that would leave the event overpaid; return the excess through a deposit withdrawal instead.",
      "Final settlement: Reconciliation calculates the final amount owed; the balance is collected as a final balance payment and extra charges as additional payments."
    ],
    features: [
      "One payment ledger per event with every payment type, method, proof and status",
      "Maker-checker control: staff submit, a separate approver approves",
      "Customer self-declared deposits and transfer screenshots, verified before they count",
      "Warn-don't-block deposit floor with a mandatory confirmation",
      "Audited voids, credit notes and deposit withdrawals",
      "Tiered cancellation penalties and deposit refundability",
      "Automatic posting of approved payments to the finance ledger",
      "Live balance due and deposit status on every event"
    ],
    access: [
      "Approving catering payments: administrators and users with Catering Payment Approval (catering_payment_approve) or catering finance access (catering_finance)",
      "Catering Deposit Withdrawals (deposit_withdrawal_approve): approve deposit withdrawals",
      "Issue Credit Notes (catering_finance)",
      "Booking Approvals (catering_booking_approve): approve or reject bookings in Approvals › Booking Approvals when the booking's payment policy names your role",
      "Catering staff with access to the event submit payments for approval"
    ],
    entities: [
      { name: "CateringPayment", description: "Payment on an event: type (deposit, final_balance, additional, refund, penalty, deposit_withdrawal), source, amount, method (cash, card, bank_transfer, instapay, wallet), status (pending, completed, refunded, voided, rejected), payment date, reference, receipt, recorded by, credit note, approved by/date, rejection reason, voided by/date/reason, and for deposits the minimum percent and amount set by the % box" },
      { name: "CateringTransferProof", description: "Customer-uploaded transfer: transfer type (deposit or full_amount), amount, method, reference, screenshot, transfer date, status (pending, verified, rejected), reviewer and review note" },
      { name: "CateringEvent", description: "deposit_percentage, required_deposit_amount, deposit_paid_amount, total_paid, balance_due, deposit_status, declared deposit method/reference/date/amount, cancellation penalty fields" },
      { name: "CateringCancellationPolicy", description: "Tiers deciding the penalty % and deposit refundability by notice period" },
      { name: "CateringPaymentReviewLock", description: "Server-held lock that serializes payment reviews per event" },
      { name: "FinanceJournal", description: "Ledger journals created automatically for approved catering payments" }
    ]
  }),
  catering({
    name: "Confirm & Start, Planning & Procurement",
    screens: [
      "Booking › Confirm & Start (users with POS access): checks that the event is confirmed with a verified deposit and has an active quote, then starts operations. It shows the client and a readout of what was reserved, and auto-starts once when a confirmed event is opened. Blocked states explain why: No event selected; Event must be confirmed — deposit verification pending; No active quote; Operations could not start automatically.",
      "Planning & Prep › Planning: builds the production plan from the active quote. Recipes are exploded into ingredient needs; items made in-house become catering production batches (required output quantity, batches rounded up, needed by the event date); bought or finished items become stock pulls. Every need becomes a stock reservation (reserved quantity, free stock at the time, shortfall quantity, needed-by date, at-risk flag). Lines that can't be mapped are listed for resolution: map them to a recipe, or mark the quote line as manually sourced.",
      "Approvals Center › Catering › Event Reservations: approvers approve & reserve, or send back with a reason, the stock reservations of a planning run.",
      "Planning & Prep › Shortfall Queue: a cross-event list of materials still MISSING (no live purchase order) with quantities, needed-by dates and urgency. Ordering happens only through the Recommended Cart in Purchases, so a shortfall can't be ordered twice; catering purchase orders are approved in Approvals Center › Purchasing & Stock › Catering POs."
    ],
    workflows: [
      "Confirm & Start: the server re-checks deposit coverage from the live payment ledger → locks the approved quote → moves the event into production → reserves the equipment the source package calls for → allocates consumable materials (recipe needs plus the package's material template) against shared free stock → flags shortfalls (never blocks; covering purchase orders are drafted for procurement) → notifies newly assigned crew in-app. On-hand stock is not changed here: allocation is a reservation ledger. Confirming again replaces the event's earlier holds instead of stacking them (this is also how a guest-count change after confirmation is picked up); equipment already dispatched stays.",
      "Requirement scaling: flat = fixed quantity; per guest = ceil(guests ÷ divisor) × quantity. The guest count is the guarantee once locked, otherwise expected guests. Planned quantities are rounded to 2 decimals.",
      "Reservation status on the event: none → pending_approval → reserved (or shortfall when stock is missing) → released when the holds are let go; a sent-back run keeps the reason.",
      "Procurement status on the event: none → po_raised → partially_delivered → covered, with open shortfall and purchase order counts. Urgent shortfalls are escalated automatically on a schedule, using the planning horizon, urgent threshold and delivery buffer from the catering procurement settings.",
      "Production plan status: none → planned → released. Each planning run also creates or refreshes the event's Stock Release Slip Requisition draft."
    ],
    features: [
      "One-click start of operations that locks the quote and reserves equipment and materials",
      "Recipe explosion into exact ingredient needs and production batches per event",
      "Reservation ledger that protects stock for events without touching on-hand quantities",
      "Early shortfall visibility across all events with needed-by dates and urgency",
      "No double ordering: shortfalls are ordered only through the Recommended Cart",
      "Approval gates for reservations and catering purchase orders",
      "Guest-count changes picked up by re-confirming, without duplicate holds",
      "Automatic escalation of urgent shortfalls"
    ],
    access: [
      "Confirm & Start tab: users with POS access (pos_view or pos_access) while the POS module is enabled",
      "Reservation Approval (catering_reservation_approve): approve & reserve or send back reservations; Approve Stock Reservations & Close Events (catering_approve)",
      "Create / Edit Events, Quotes & Packages (catering_edit): run planning and resolve unplanned lines",
      "Purchasing staff order shortfalls through the Recommended Cart; catering purchase orders need approval"
    ],
    entities: [
      { name: "CateringReservation", description: "Stock committed to an event: inventory item, unit, purpose (stock_pull = taken straight from stock; production_input = raw ingredient for a production batch), production order, produced item, quantity reserved, free stock at reservation, shortfall quantity, needed-by date, at_risk, purchase order and procurement status (none, po_pending, po_approved, po_delivered, po_cancelled), status (reserved, released, consumed)" },
      { name: "ProductionOrder", description: "Catering production batches (order_source catering): recipe, output item, target batches, required output quantity, needed-by date, event, guests, prep stage, assigned staff" },
      { name: "CateringEvent", description: "reservation_status (none, pending_approval, reserved, shortfall, released), reservation requested/approved by and dates, rejection reason, shortfall count, procurement_status, PO count, open shortfall count, production_plan_status, production batch count" },
      { name: "CateringEquipmentReservation", description: "Equipment reserved at Confirm & Start from the package's equipment requirements" },
      { name: "PurchaseOrder", description: "Purchase orders raised from the Recommended Cart to cover catering shortfalls; they need approval" },
      { name: "CateringProcurementSettings", description: "planning_horizon_days, urgent_threshold_days, default_delivery_buffer_days" },
      { name: "InventoryItem", description: "Stock levels, units and cost per unit used for allocation and costing; each branch has its own items, and source_item_id links an item to the one it was copied from in another branch" },
      { name: "Recipe", description: "Recipes exploded into ingredient needs" }
    ]
  }),
  catering({
    name: "Stock Release Slip Requisitions",
    screens: [
      "Planning & Prep › Stock Release Slip Requisitions: per event, the requisition number (REQ-<event code>, with -2, -3… after a cancellation), status, whose turn it is (chef, inventory, approver or none), revision counter, line counts (planned, extra, pending, confirmed, edited, declined, agreed), estimated planned and extras cost, uncosted lines, release batches and the full Permit Trail history. Release slips made before requisitions existed are read-only history.",
      "Kitchen Display › Kitchen station › catering panel (views: Both, Planned Production, Stock Release Slips, Requisitions): the Head Chef submits the requisition, answers inventory's edits and declines (Accept, or Counter with a new quantity and comment), adds extra items, proposes batch plan changes and confirms receipt of released batches.",
      "Inventory Management › Requested Items: the inventory team confirms, edits (agreed quantity and reason) or declines (reason; the line's reservation is released) each line, sees free stock, releases due batches (issuing the stock) and answers batch plan proposals.",
      "Approvals Center › Catering › Over-Limit Requisitions: the approver sees the approval basis (limit %, planned food cost and where it came from, limit amount, extras total, uncosted extras) and approves or rejects with a reason.",
      "Notifications: every hand-off notifies the users holding the matching permission, with a link straight to the requisition (KDS Requisitions, Requested Items or the Approvals queue)."
    ],
    workflows: [
      "Lifecycle: draft (created by planning from the event's reservations, one planned line per reservation) → submitted by the chef (inventory's turn) → replied by inventory (line decisions) → the chef accepts or counters (back to inventory) → when every active line is agreed: confirmed → immediately scheduled with batch 1 on the event date → inventory releases the batches → fulfilled when the last batch is released. Requisitions can also end rejected or cancelled. Only one active requisition exists per event.",
      "Line rules: planned lines mirror a stock reservation; extra lines are the chef's additional requests. Inventory decides confirmed, edited or declined; the chef responds accepted or countered. A line is agreed when inventory confirms it or the chef accepts inventory's edit or decline; agreed lines are locked for both sides. Lines are deactivated, never deleted. There is no limit on counter rounds.",
      "Extra items limit: the extras total is checked against limit % × planned food cost (the active quote's food cost, else the requisition's planned estimate). An empty limit counts as 0, so every extra needs approval. Over the limit the requisition becomes pending_approval and nobody but an approver can act. Approval records the approved extras total; later changes need approval again only if the total rises above it, a new uncosted extra appears, or an approved uncosted extra's quantity rises. Rejection restores the requisition exactly as it was before the change.",
      "Costing: a line is costed only when its unit matches the item's cost unit (purchase unit, else unit) and the item has a cost. Uncosted lines are counted separately and never treated as zero.",
      "Permit Trail: every action writes an append-only revision (who, side, action, comment, each line's quantity before and after, decision and reason, batch plans). Each action must carry the revision the user was looking at; if someone else acted first, the action is refused as stale and the screen refreshes.",
      "Batches: confirmation creates batch 1 (a stock release slip, status scheduled). Either side can propose a new batch plan for unreleased quantities (split across dates, move quantities, change dates); the other side accepts, declines with a reason, or proposes a different plan, and the proposer can withdraw. Released batches are locked. Inventory releases a batch (stock is issued and counts as actual food cost: released); the chef confirms receipt with an optional comment (received).",
      "Closeout and release: at event closeout a draft is cancelled; pending_approval, submitted or replied blocks closeout; a scheduled requisition with unreleased batches blocks it until they are released or 'close anyway' voids them with a reason; batches released but not received are noted. If the event's reservations are released, the open requisition is cancelled (unreleased batches voided); with no batch released, the next planning run reopens it as a clean draft, otherwise it stays cancelled (stock issued) and planning is refused."
    ],
    features: [
      "One negotiated, auditable stock request per event between the Head Chef and the inventory team",
      "Planned lines generated automatically from the event's reservations",
      "Extra items controlled by a budget limit with approvals",
      "Append-only Permit Trail with stale-action protection",
      "Batch releases on chosen dates with proposals both sides can negotiate",
      "Stock issued only on release, so actual food cost is captured at the moment it happens",
      "Chef receipt confirmation closes the loop on every batch",
      "Clear closeout rules so no event closes with unissued or unanswered requests",
      "Permission-based notifications with deep links"
    ],
    access: [
      "View Requisitions (requisition_view): see requisitions, lines, history and batches, and receive requisition notifications (reads are branch-scoped)",
      "Chef: Request & Receive (requisition_submit): add extras, submit, accept or counter, propose batch splits and confirm receipt",
      "Inventory: Respond (requisition_respond): confirm, edit or decline lines and propose batch splits",
      "Release Batches (requisition_release): release scheduled batches, issuing their stock",
      "Approve Over-Limit Requisitions (requisition_approve): approve or reject in the Approvals Center",
      "Edit Catering Settings (catering_settings_edit): set the extra items limit"
    ],
    entities: [
      { name: "Requisition", description: "Per event: requisition number, status (draft, pending_approval, submitted, replied, confirmed, scheduled, fulfilled, rejected, cancelled), awaiting side, current revision, counter round, planned and extras estimated cost, uncosted line count, line counts, approval status / approver / reason / approved extras cost, rejection reason, chef, batch count, open batch plan proposal, cancel source" },
      { name: "RequisitionLine", description: "Line: type (planned/extra), inventory item, unit, purpose, requested quantity, agreed quantity, reservation, estimated unit cost and cost status, needed-by date, inventory decision, chef response, is_agreed, decision reason, chef comment, active" },
      { name: "RequisitionRevision", description: "Append-only Permit Trail entry: revision number, side, action, actor, date, comment, approval basis values, batch plans, per-line snapshots" },
      { name: "KitchenReleaseSlip", description: "Batch slips (requisition, batch number, needed-by date, lines, status scheduled → released → received, or void; released/received by and dates, receipt comment) and read-only legacy slips" },
      { name: "CateringSettings", description: "extra_items_limit_percent: the extras limit as % of planned food cost" },
      { name: "Notification", description: "In-app hand-off notifications with a link to the requisition" }
    ]
  }),
  catering({
    name: "Staffing, Equipment, Logistics & Custody",
    screens: [
      "Planning & Prep › Staffing: staffing requirements per role (required versus suggested count from guests-per-staff ratios and minimums; critical roles); assign employees (regular, temporary or freelance) with start and end time, expected hours, hourly or flat rate and estimated cost; check-in location (branch or event site); availability conflicts with override and reason; match score; release an assignment to take that person off the event. Cards: Headcount, Unfilled critical, Estimated labor cost, Margin after labor.",
      "Planning & Prep › Equipment: Equipment registry (ovens, tents, chairs, generators…) with bulk or unit tracking, total quantity, unit label, owned or rented, purchase cost, useful life, salvage %, usage cost per event, replacement cost, home branch, storage location and 'requires vehicle'; Availability and Location; per-event reservations (requested → reserved → dispatched → returned, or released) with conflict override; return check-in (returned, damaged and missing quantities, missing cost from the replacement cost); maintenance and damage records (open → in progress → resolved, with cost); 'Equipment cost for this event'; and the 'Chain of custody' section with custody stage assignment and the custody email switch.",
      "Planning & Prep › Logistics (only when the in-house logistics module is on): vehicles (name, plate, type, capacity, home branch, status, cost per km or per day) and trips per event: vehicle (with conflict override), driver from the staffing assignments, destination with map coordinates, stage planned → loading → dispatched → arrived → returning → returned (or cancelled) with timestamps, a checklist of equipment, production and stock items (pending, ok, damaged, missing, not applicable), transport cost (distance × cost per km, or days × cost per day, plus extra cost), discrepancy count and return notes.",
      "My Custody page (staff): the custody stages assigned to the signed-in employee; confirm a stage complete or report a shortage with item details, notes and a photo.",
      "Operations › Assets and Resources: how equipment, staffing and logistics resources are allocated across events (All, Equipment, Staffing, Logistics) with date-window and event filters, a cost table and a staff allocation list."
    ],
    workflows: [
      "Staffing: roles define guests per staff, minimum count, critical flag, required skills, pay basis (hourly or flat per event) and default rates → assign the best-matched people (skills, catering events worked, largest event worked) → crew are notified in-app → crew attendance on the day → estimated labor cost → labor cost can be locked → actual labor cost after the event.",
      "Equipment: package equipment requirements are reserved at Confirm & Start → dispatched → checked in on return → damaged or missing units create maintenance records and cost → usage plus damage and missing costs feed the event's actual equipment cost.",
      "Chain of custody: each trip has four custody stages (dispatched, delivered, collected, returned) with a responsible person per stage. Each checkpoint is confirmed complete or reported as a shortage (items, notes, photo); shortages go to Approvals Center › Catering › Custody Shortages. Overdue stages send reminder emails to the assigned person and a digest to administrators; this can be switched off.",
      "Logistics off: when a third-party supplier handles transport, switch the in-house logistics module off in Lists & Settings; the Logistics tab and transport costs are hidden."
    ],
    features: [
      "Role-based staffing plans scaled to guest count, with critical-role alerts",
      "Skill and experience matching with conflict detection and audited overrides",
      "Live labor cost and margin after labor before the event",
      "Equipment registry with depreciation, usage cost per event and unit-level tracking",
      "Conflict-checked equipment reservations and return check-in with damage and loss costing",
      "Vehicle and trip planning with stage timestamps, checklists and transport costing",
      "Four-stage chain of custody with photo evidence and shortage approvals",
      "Personal My Custody page and overdue reminders"
    ],
    access: [
      "View Catering Module (catering_view) and Create / Edit (catering_edit) for staffing, equipment and logistics",
      "Custody Shortages queue: Approve Stock Reservations & Close Events (catering_approve)",
      "Custody stage owners use My Custody"
    ],
    entities: [
      { name: "CateringStaffingRole", description: "Role: positions matched, department, guests per staff, min count, critical, required skills, pay basis (hourly/flat_event), default hourly and flat rates, event types, active" },
      { name: "CateringAssignment", description: "Assignment: event, role, critical flag, check-in location type (branch/event_site), employee and employment type, start/end, expected hours, rate, estimated cost, shift, status (confirmed/released), notified, availability conflict and override, match score" },
      { name: "Employee", description: "Staff with skills, catering events worked and largest event guests (used for matching)" },
      { name: "CateringEquipment", description: "Equipment type: category, tracking mode (bulk/unit), total quantity, unit label, purchase cost and date, useful life, salvage %, usage cost per event, owned/rented, replacement cost, home branch, storage location, requires vehicle" },
      { name: "CateringEquipmentUnit", description: "Individual unit: code, serial number, status, current location and event" },
      { name: "CateringEquipmentReservation", description: "Per-event reservation: quantity or unit, usage cost, status (requested, reserved, dispatched, returned, released), conflict override, dispatched/returned dates, returned / damaged / missing quantities, missing cost" },
      { name: "CateringEquipmentMaintenance", description: "Maintenance or damage record: status (open, in_progress, resolved), quantity affected, cost, event" },
      { name: "CateringVehicle", description: "Vehicle: plate, type, capacity, home branch, status, cost basis (per_km/per_day) and rates" },
      { name: "CateringTrip", description: "Trip: vehicle, driver, destination and coordinates, stage and timestamps, checklist, custody assignments and confirmed stages, cost basis, distance, days, extra cost, estimated transport cost, discrepancies" },
      { name: "CateringCustodyCheckpoint", description: "Custody checkpoint: trip, stage (dispatched, delivered, collected, returned), status (confirmed_complete/shortage), reporter, responsible person, item details, discrepancy notes, photo" },
      { name: "CateringSettings", description: "logistics_enabled (in-house logistics switch) and custody_emails_enabled (custody reminder emails)" }
    ]
  }),
  catering({
    name: "Event Day, Kitchen Execution & Closeout",
    screens: [
      "Event Day › Execution: live status of the selected event: Production progress, Dispatch progress, Crew attendance and the Crew on the day list.",
      "Kitchen Display › Head Chef Production Board: every catering prep batch and quoted menu item for upcoming events. The Head Chef assigns kitchen staff to batches (and to menu items that have no batch) and moves batches through queued → prepping → cooking → ready → handed off, with prep notes and the handoff (received by, recorded by, time). Kitchen staff see the items assigned to them.",
      "Event Day › Returned: unused items returned from the event: item, category (food, beverage, raw material, packaging, other), quantity, unit cost, value, condition (reusable, damaged, spoiled) and disposition (returned to stock, staff meal, wasted, pending).",
      "Event Day › Reconciliation: Guest count (Expected, Guaranteed, Actual attended; billable guests and billing basis), Additional charges during the event (extra food, beverage, overtime, equipment damage, equipment loss, transport, other), Final billing (quote total, guest adjustment and additional charges give the final billing total; Already paid (deposits & payments); Final amount owed), Equipment & stock closeout (returned, still out, damaged, missing; Release remaining stock), Post-event notes, Client feedback and Rating (1–5). Save once before the event can be closed, then finalize.",
      "Event Day › Staff Feedback (administrators and users with catering_edit or catering_finance): pick an event and rate each person who worked it (rating and feedback).",
      "Executive Dashboard › Catering: Event P&L, Bookings & Pipeline, Cost Variance, Loss Analysis, Catering Staffing, Equipment & Returns, Client Feedback and Catering Advisor."
    ],
    workflows: [
      "Event day: confirmed → in_progress → production batches move through the prep stages on the Head Chef board → requisition batches are released and received → trips are dispatched with custody checkpoints → crew attendance is recorded.",
      "Closeout: record returned items → complete Reconciliation (actual guests, additional charges, equipment & stock closeout) → release remaining stock → finalize → event completed. Open requisitions must be closed out first (see Stock Release Slip Requisitions).",
      "Actual costs and margin: recalculated automatically when stock releases, returns, waste, equipment returns or damage, or the reconciliation change (a manual recompute is also available). Actual food cost (stock released, net of reusable returns), actual labor cost (shifts and attendance), actual equipment cost (usage plus damage and missing), total cost, actual revenue (the finalized reconciliation, else total paid), margin and margin %. Warnings flag incomplete data such as missing purchase prices or missing staff shifts, and a margin bridge explains the gap between quoted and actual margin.",
      "Loss analysis: each event is classed loss, underperforming, on target or insufficient data against its applicable target margin (package, event type, catering default or restaurant default). Manual cost exceptions (breakage, overtime, extra depletion; by category) add costs not captured elsewhere and are voided, never deleted."
    ],
    features: [
      "Live event-day view of production, dispatch and crew attendance",
      "Head Chef production board with staff assignment, prep stages and handoff records",
      "Returned-items log that separates reusable stock from waste",
      "Guest reconciliation with guarantee-aware billing and additional charges",
      "Equipment and stock closeout before an event can close",
      "Staff performance ratings per event",
      "Automatic actual food, labor and equipment cost with margin and data-quality warnings",
      "Loss analysis, P&L and advisor insights in the Executive Dashboard"
    ],
    access: [
      "Head Chef Production Board: Kitchen Display access (kds_view)",
      "Approve Stock Reservations & Close Events (catering_approve): close events",
      "Staff Feedback: administrators and users with catering_edit or catering_finance"
    ],
    entities: [
      { name: "ProductionOrder", description: "Catering prep batch: prep stage (queued, prepping, cooking, ready, handed_off), assigned staff, prep notes, handoff to / by / date" },
      { name: "KitchenItemAssignment", description: "Head Chef assignment of a quoted menu item without its own batch to a kitchen staff member" },
      { name: "CateringReturnedItem", description: "Returned item: category, quantity, unit, unit cost, total value, condition (reusable, damaged, spoiled), disposition (returned_to_stock, staff_meal, wasted, pending)" },
      { name: "CateringReconciliation", description: "Closeout: expected / guaranteed / actual / billable guests, billing basis, quote total, guest adjustment, additional charges (extra_food, beverage, overtime, equipment_damage, equipment_loss, transport, other), final billing total, total paid, final balance due, equipment returned / outstanding / damaged / missing counts, inventory released, post-event notes, client feedback and rating, status (open/finalized)" },
      { name: "CateringStaffFeedback", description: "Rating and comment per staff member per event, with source and review status" },
      { name: "CateringActualCostRun", description: "Versioned actual-cost calculation: food, labor, equipment and total cost, revenue, margin and %, margin bridge, warning codes, source counts" },
      { name: "CateringCostException", description: "Manual post-event cost by category (food, equipment, labor, transport, other); active or voided" },
      { name: "CateringEvent", description: "actual_food_cost, actual_labor_cost, actual_equipment_cost, actual_total_cost, actual_revenue and basis, actual_margin and %, actual_cost_status and warnings, loss_analysis_status, applicable target margin and source" }
    ]
  }),
  catering({
    name: "Guest Engagement & Customer Portal",
    screens: [
      "Guest Engagement › Invitations › Guests: the guest list for the selected event (name, email, phone, party size). Each guest gets a unique attendance link and pass code. Filters: All, Invitation sent, Not sent yet, No reply yet. Send by email, WhatsApp or SMS, in English or Arabic; copy the attendance link; open the attendance page; delete a guest. Shows RSVP status (invited, attending, declined, maybe), RSVP party size and date, dietary notes, guest message, table assignment and check-in.",
      "Guest Engagement › Invitations › Mail configuration: the invitation email subject and body and the document email subject and body, each in English and Arabic.",
      "Settings › Mail has two sub-tabs. Mail templates: the same invitation and document email templates as Mail configuration (the document email is for quotations and invoices; payment receipts have their own email in Client Receipt). There is no separate invitation logo: the guest invitation / attendance pass page always shows the logo set in Admin › Branding.",
      "Settings › Mail › Client Receipt: the PDF receipt a client gets for an approved deposit, final balance or additional payment. Sending: email the receipt automatically when Finance approves a payment, for the payment types ticked (while deposit receipts are automatic, the client no longer also gets the plain 'Deposit received' email from Admin › Email); receipt language (English, Arabic, or both as two PDFs); sender name (empty uses the brand name). Email message: subject and message in English and Arabic, with placeholders for the client, event, event date, amount, payment type, method, payment date, reference, receipt number, event total, total paid, remaining and brand name. Header: receipt title in English and Arabic, logo position (left or right, kept on the same side in both languages, with the business details on the other side), accent colour, show logo, show business name, show business address, phones, email and website, and extra header lines such as a tax registration number. Body and footer: show or hide the client phone and email, event date, venue and guests, payment details, approval date, event total, paid and remaining, payment history and a signature line with its label, plus a note and a footer in English and Arabic. Preview English and Preview Arabic open the receipt with sample figures and the unsaved changes; Save applies them. Only staff with catering settings or catering edit access open and change these settings, and every save is recorded in the audit log. On each approved client payment in Booking › Deposits & Payments: the download button saves the receipt PDF; Email receipt / Resend receipt (staff who handle catering payments) sends it to the client's email on record, never to a typed address, and asks for English or Arabic first when automatic receipts are off for that payment type; hovering shows when it was last sent, to whom and whether automatically or by whom, or why the last attempt failed.",
      "Event RSVP page (guest link): the guest answers attending, declined or maybe, with party size, dietary notes and a message.",
      "Event Pass page: the guest's attendance pass used for check-in on the day.",
      "Guest Engagement › Portal Access: invite a customer to the portal (client and customer email, then Send invitation). Access status: invited → linked (when the customer signs in with that email) → revoked. Scoped to the selected event's client.",
      "Customer Portal › My Events: the customer's events with details, guests, quote total, paid and balance; the quote shown according to the Quote settings (or the event's override); approve the quote (Total to approve, split into Food & beverage and Servicing cost); Pay your deposit (How did you send it? and the transfer reference); upload transfer screenshots (what was transferred: deposit or full amount; amount; method: bank transfer, InstaPay, mobile wallet, cash or card; date; reference); Payments & documents; Transfers."
    ],
    workflows: [
      "Invitations: add guests → send invitations (email, WhatsApp or SMS; English or Arabic) → the guest opens the link → RSVP → attendance pass → check-in on the day. The sent / not sent / no reply filters drive follow-up.",
      "Customer portal: Portal Access invitation → the customer signs in → access linked → the customer reviews and approves the quote → declares the deposit and uploads proof → staff verify it in Deposits & Payments → the event is confirmed; the customer follows payments and documents in the portal."
    ],
    features: [
      "Personal attendance links and pass codes for every guest",
      "Multi-channel, bilingual invitations with editable email templates",
      "RSVP tracking with party size, dietary notes and messages",
      "Table assignment and day-of check-in",
      "Branded invitation pages showing the logo from Admin › Branding",
      "Self-service customer portal: quote approval, deposit declaration and transfer proofs",
      "Customer view controlled by the Quote settings, per event if needed"
    ],
    access: [
      "Create / Edit (catering_edit) to manage guests and portal access",
      "Guests use their personal link; customers need a linked portal account"
    ],
    entities: [
      { name: "CateringInvitation", description: "Guest: name, email, phone, party size, token, pass code, RSVP status (invited, attending, declined, maybe), RSVP party size and date, email/WhatsApp/SMS sent times, last channel, dietary notes, guest message, table assignment, checked in and time" },
      { name: "CateringPassBranding", description: "Email templates (invitation and document subject/body, English and Arabic)" },
      { name: "CateringPortalAccess", description: "Portal access per customer: client, email, status (invited, linked, revoked), linked user, invited/linked/revoked by and dates" },
      { name: "CateringTransferProof", description: "Transfers the customer uploads for verification" },
      { name: "CateringPortalQuoteOverride", description: "Per-event customer view override" },
      { name: "CateringQuote", description: "The quote the customer approves or declines" }
    ]
  }),
  catering({
    name: "Catering Settings & Access Control",
    screens: [
      "Settings › Lists & Settings: editable lists (Event Types, Service Styles, Dress Codes, Package Categories) used by the event and package forms, each with active switches and ordering; Target margin (Default target margin %, used when neither the package nor the event type has a target); In-house logistics module switch (turn off when a third-party supplier handles transport); Extra items limit (% of planned food cost).",
      "Settings › Payment Policies: what a client pays, when it is due and whether the booking needs approval, set per booking window without code changes. Days ahead are counted from the day the event is requested to the event date. The tab lists every policy (lowest window first) as a card with its window, numbered payment steps, approval rule, notes and any warnings, plus an Active switch, Edit and Delete for users who may edit; a banner checks the active policies together and names any days-ahead range no active policy covers or two policies both cover (or confirms every booking matches exactly one policy). New policy / Edit opens the editor: Policy name, Active and Notes; Booking window (booked at least N days and less than M days before the event; an empty upper limit means no limit); Payment schedule: how the amounts add up (Running total: each step is the total the client must have paid by then; Separate payments: each step is a new payment on top of the earlier ones) and the payment steps, each with an optional name, an amount (a % of the quote, a fixed EGP amount or the remaining balance) and a due point (on the booking day, N days after booking or N days before the event); Approval: Needs approval, Approved by (a role from Role Management), the status shown on the event while it waits, and Hold the event until it's approved; Preview: the schedule worked out on a sample quote total, with each payment, the total paid after it and anything left with no due date. Warnings flag a payment that would fall due before the booking day (or after the event) for the shortest-notice bookings in the window, steps that may not add up to the whole quote, and separate percentages above 100%. Every new event is booked under the active policy for its date and keeps a copy of it, so later edits only affect new bookings and reschedules; a date no active policy covers can't be booked.",
      "Settings › Quote, Packages & Media and Mail: customer quote visibility, the package catalog with photo & video vendors, and the invitation and document email templates (see the Quotes and Guest Engagement modules).",
      "Operations › Assets and Resources (moved out of Catering › Settings): equipment, staffing and logistics allocation across events (see the Staffing, Equipment, Logistics & Custody module).",
      "Admin › Users & roles: per-role Catering tab access (hide a parent tab with all its sub-tabs, or single sub-tabs), module access, branch assignment and the catering permission flags."
    ],
    workflows: [
      "Initial setup: fill the lists → set the default target margin → decide on in-house logistics → set the extra items limit → define the payment policies → build packages and staffing roles → register equipment and vehicles → set the Quote settings → assign roles and permissions.",
      "Payment policies: add one policy per booking window, starting at 0 days and ending with one that has no upper limit → add the payment steps in the order they fall due and end with a Remaining balance step → turn on approval where bookings need sign-off and pick the approving role → check the Preview, then clear the step warnings and adjust the windows until the banner confirms every booking matches exactly one policy.",
      "Access design: give each role only the permissions its job needs (sales: create/edit; finance: payments and credit notes; approvers: approvals; Head Chef: requisition submit and receive; inventory: respond and release) and hide the tabs a role doesn't use."
    ],
    features: [
      "Self-managed dropdown lists without code changes",
      "Margin targets cascading package → event type → catering default → restaurant default",
      "Switchable in-house logistics",
      "Budget control for requisition extras",
      "Payment policies by how far ahead an event is booked: booking windows, payment steps and approval rules, without code changes",
      "Fine-grained permissions and per-role tab visibility",
      "Branch scoping for multi-branch operations"
    ],
    access: [
      "Edit Catering Settings (catering_settings_edit): save Lists & Settings (including the extra items limit) and Payment Policies; everyone else who can open Catering › Settings sees the payment policies read-only",
      "View Catering Module (catering_view); Create / Edit Events, Quotes & Packages (catering_edit); Approve Stock Reservations & Close Events (catering_approve); Issue Credit Notes (catering_finance); Catering Payment Approval (catering_payment_approve); Quote Approvals (catering_quote_approve); Booking Approvals (catering_booking_approve, for the payment policies naming the role); Reservation Approval (catering_reservation_approve); Catering Deposit Withdrawals (deposit_withdrawal_approve)",
      "Requisitions: View Requisitions, Chef: Request & Receive, Inventory: Respond, Release Batches, Approve Over-Limit Requisitions",
      "Only administrators manage roles and per-role tab visibility"
    ],
    entities: [
      { name: "CateringOption", description: "List entries: list type (event_type, service_style, dress_code, package_category), name, description, active, sort order" },
      { name: "CateringSettings", description: "logistics_enabled, custody_emails_enabled, extra_items_limit_percent, customer quote visibility settings" },
      { name: "CateringPaymentPolicy", description: "One payment policy per booking window: name, notes, is_active, min_days_before (included), max_days_before (not included; empty = no limit), amount_mode (running_total or separate), schedule steps (label, amount_type percent / fixed / balance, amount, due_type booking_day / days_after_booking / days_before_event, due_days), requires_approval, approver_role_key, approval_status_label, hold_until_approved" },
      { name: "SystemSettings", description: "Restaurant and catering target margin defaults" },
      { name: "Role", description: "Role permissions, module denials and closed tabs (disabled_tabs, e.g. Catering:planning closes one sub-tab)" },
      { name: "UserPermissions", description: "User's role, sparse permission and module overrides, branch assignment" }
    ]
  })
];