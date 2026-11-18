export default `
# 3. Catering Team

**Who:** users with the role preset *Manager*, *Restaurant Manager*, *Head KDS Kitchen*, *Head KDS Bar* (and admins). *Catering Manager* and *Call Centre* additionally keep the **CRM → Referrals** view. Server‑side, each user may be limited to specific branches via *catering_branch_ids*.

**Where:** the **Catering** link in the header. Pick a branch first — everything is branch‑scoped.

## 3.1 The event lifecycle

Statuses, in order:

*enquiry → quoted → deposit_pending → deposit_pending_verification → confirmed → in_progress → completed* (or *cancelled* at any point).

- **enquiry** — created from the public Packages page or by staff.
- **quoted** — at least one quote revision exists.
- **deposit_pending** — a quote is live and a deposit is due: the payment policy's first payment (Deposit % on events booked before payment policies). **Customer acceptance is not required to get here or to move on** — paying the deposit is the commitment.
- **deposit_pending_verification** — an offline transfer (bank / InstaPay / wallet) has been declared: either by the customer in the portal, or by catering staff who received the client's transfer screenshot over WhatsApp and logged it on the client's behalf. No money is recorded yet; staff must verify.
- **confirmed** — the deposit is recorded in *Deposits & Payments* (a booking its payment policy holds for approval is confirmed once the approver approves it). Nothing operational has happened yet, and **no stock is reserved**: the reservation goes to *pending approval* for a Catering Manager/owner.
- **in_progress** — *Confirm & Start Operations* was pressed: quote locked, labour cost frozen, equipment reserved, materials allocated.
- **completed** — reconciliation finalised.
- **cancelled** — the cancellation policy computes a penalty and the deposit is marked retained / refundable / refunded; reservations are released.

## 3.2 Working "scoped to an event"

Most tabs work on one event. Select an event in **Events** (or from **Approvals**) and an amber badge *"Scoped to: …"* appears in the header. Tabs then show that event's data; clear the badge with ✕. With no event chosen, these tabs list every event's records in the selected branch instead: **Quotes**, **Deposits & Payments**, **Confirm & Start**, **Planning**, **Staffing**, **Logistics** (every trip), **Execution**, **Returned**, **Reconciliation** and **Invitations › Guests** (every invited guest). Each list has filters at the top, shows 50 rows at a time with **Load more**, and has an **Open event** button on each row that opens the same tab scoped to that event, where all its actions are. Every one of these lists starts on **Upcoming** events (today first) and switches to **Past** or **All dates** on request; older events are only loaded when you ask for them. The same choice sits on **Events** (next to Today, This week and This month), **Calendar**, **Stock Release Slip Requisitions**, **Shortfall Queue**, **Discounts › By event**, **Staff Feedback** and the events overview on **Quick Actions**. Deposits & Payments also shows totals received, refunded & withdrawn, and awaiting approval; Reconciliation also lists completed events that have no reconciliation yet. In Confirm & Start the button on a confirmed event reads **Open & start**: opening it starts that event's operations automatically. The other tabs that need a scope show a "Select an event" notice when none is chosen.

## 3.3 Booking group

### Events
Create, edit, cancel and delete events. Fields: client (search or create — duplicate warnings are shown), event type, date/time (duration is derived), on‑site vs off‑site with venue name/address/GPS (map picker), indoor/outdoor, theme, decoration, service style, dress code, structured **special requests** (dietary / allergy / accessibility / beverage / other, guest reference, count, kitchen‑critical flag), on‑site contact, **expected vs guaranteed guests** and **guarantee cut‑off date** (after which billing locks to the guaranteed count). Cards show status chips, deposit/balance, staffing/reservation/procurement roll‑ups and warnings.

The form shows the **payment policy** for the chosen date (its payment steps and approval rule) and refuses a date no active policy covers; Deposit % shows only on events booked before payment policies. A new date re-applies the policy. Cards carry the booking's approval badge (*Awaiting approval*, *Booking approved*, *Booking not approved*).

### Calendar
Month grid, agenda list and multi‑month overview of events with type/status colouring, conflict detection (same venue/day, double‑booked staff or equipment) and a side drawer with event details.

### Quotes
Each event holds numbered **revisions**; one is *active*. **New Revision** opens the quote builder:
- **Package picker** — pull in one or many catalog packages; line items expand per guest count. Default mode is *itemised* (headline package price spread across the lines); alternative *headline* mode keeps a single package line.
- **Line items** — menu items (recipe‑costed) or bespoke custom items; per‑guest or fixed scaling; unit price and unit cost; tax/service exempt toggles and bulk exempt switches.
- **Additional charges**, **discount** (percent or amount, applied to the gross total), **variant label** (e.g. "Option B").
- Live totals: subtotal, tax, service, total, required deposit, estimated cost, estimated margin.
- **Credit check** against the client's catering credit limit — an override is recorded on the quote.

On each revision: **Print** (quotation PDF, EN/AR), **WhatsApp** and **Email** the document (a fresh PDF is generated every time and the message is pre‑filled from the Mail templates), **Edit** (active only), **Delete**. Below the list, **Client quote visibility** controls what the portal shows for this event (balance due, service costs, payment history…).

### Deposits & Payments
Record deposit / balance / refund payments (method, reference, proof). **The proof upload is meant to be used by staff on the client's behalf** — when a client sends the transfer screenshot over WhatsApp, the catering officer attaches that same image to the payment, so the client never has to log in for the booking to progress. Recording a deposit that meets the requirement (the payment policy's first payment) moves the event to *confirmed*; a booking the policy holds for approval waits for the approver. Deposit receipts and invoices are printable / sendable. Transfer proofs uploaded by the customer from the portal also appear here for verification.

**Payment policy card.** Events booked under a payment policy show the policy's name and when it was applied, each payment step with its due date and the total that must be paid by then (*Paid*, *Due today*, *Overdue*, *Upcoming*), and a red *Blocked by the payment policy* box while the booking is on hold, wasn't approved or a payment is overdue — Confirm & Start and stock release are refused until it's resolved. A deposit withdrawal can't take out money a payment step already requires.

**Reservation approval gate.** A fully received deposit no longer reserves stock by itself. It sets the event's reservation state to **pending_approval** and records who requested it. An amber *"Reservation awaiting manager approval"* card then appears on both *Deposits & Payments* and *Planning*, and only a user with **catering_approve** (or an admin/owner) can act on it:
- **Approve & reserve** — runs the normal allocation: materials reserved against free stock, production batches planned, shortfalls flagged to procurement. Approver and timestamp are stored on the event.
- **Send back** — nothing is committed; the reservation returns to *none* with the reason recorded, so the deposit stands but stock stays free.

This keeps the person who books the event and takes the money separate from the person who commits inventory.

### Approvals
A record of quote decisions clients did make in the portal (accepted / rejected), with a *Mark as handled* acknowledgement and internal note. **Customer approval is optional and no longer gates the workflow** — it is informational. Selecting an entry scopes the workspace to that event.

### Discounts *(catering finance / discount permission)*
Event‑type discounts (e.g. 10 % on corporate) and event‑specific discounts.

### Confirm & Start *(POS permission)*
The gate between selling and operating. Requires status *confirmed* and an active quote, and is refused while the booking is on approval hold, wasn't approved or a payment under its payment policy is overdue. Shows the client, billable guests and the quote summary, then **Confirm & Start Operations**:
1. locks the quote and freezes labour cost (with a per‑role breakdown for margin audit);
2. moves the event to *in_progress*;
3. reserves the package's **equipment requirements** (flat or per‑guest);
4. allocates **material requirements** and recipe‑exploded ingredients against free stock, creating **reservations**; shortfalls are flagged to procurement, never blocking;
5. notifies assigned staff (in‑app) once.

Afterwards the tab shows a confirmation summary with jump‑links to the tabs that need attention (shortfalls, transport, staffing).

## 3.4 Planning & Prep group

### Planning
Production planning for the scoped event: requirement lists derived from the quote, **generate production plan** (creates catering production batches), and the **Generate Purchase Cart** / **PO trigger** dialogs for shortfalls.

### Shortfall Queue
Every reservation not covered by free stock, across events: quantity short, needed‑by date, **at‑risk** flag (days remaining ≤ the item's lead time — evaluated daily by an automated job), procurement status (*none / po_pending / po_approved / po_delivered / po_cancelled*). From here you raise or link purchase orders.

### Staffing
Per event: **staffing requirements** (roles × count, seeded from guest count and event type, critical flag), coverage cards, **Assign Staff** with match scoring (skills, events worked, largest event), availability conflicts with manager override + reason, call/release times, expected hours, rate and estimated cost. Confirmed assignments create Shifts; the labour cost card shows live cost until the event is confirmed, then the frozen value. Check‑in location per assignment: branch or event site.

### Equipment
Reserve equipment units for the event (catalog items → units with codes), see conflicts with other events, plan maintenance, and log returns. Equipment cost card shows depreciation‑based cost.

### Logistics *(if enabled in Lists & Settings)*
Trips per event: vehicle, driver, departure/return, equipment loaded, and a **chain of custody** with stages and assigned custodians. Each custodian confirms their stage and counts items from **My Custody**; shortfalls are flagged and delays are escalated by an automated job.

## 3.5 Event Day group

- **Execution** — run‑sheet for the day: production batches completed, trips out/back, staff clocked in, special requests acknowledged.
- **Returned** — log items returned from the venue (quantity, condition, reason) to reconcile stock and equipment.
- **Reconciliation** — final actual guests, actual consumption, credit notes and adjustments; **finalise** to produce the **final invoice** and complete the event.
- **Staff Feedback** *(discount permission)* — rate each assigned staffer; ratings feed the staffing analytics and future match scores.

## 3.6 Guest Engagement group

### Invitations
Guest list per event: add manually or **import** from a sheet, set seats, then send invitations by **email, WhatsApp or SMS** in English or Arabic (templates from *Settings → Mail*). Each invitation has a tokenised link to the **Event Pass** where the guest RSVPs, confirms attendance and receives a QR pass. Stats show sent / attending / declined / checked‑in.

### Portal Access
Invite a client to the **Catering Portal**: the invitation e‑mail links their login to the client record on first visit. From the portal the client sees their events, active quote, payments, can approve a quote, declare a deposit transfer and upload proof, and download quotation / deposit receipt / invoice / final invoice.

## 3.7 Settings group (catering configuration)

- **Lists & Settings** — option lists (event types, service styles, dress codes, package categories), deposit percentage (used only by events booked before payment policies), **cancellation policies** (penalty % by days before), logistics module toggle, portal quote defaults, catering procurement settings (planning horizon).
- **Payment Policies** — what a client pays, when it is due and whether the booking needs approval, by how far ahead the event is booked (days from the day the event is requested to the event date). Each policy has a **booking window** (at least *N* and less than *M* days before the event; no upper limit if left empty), numbered **payment steps** (a % of the quote, a fixed EGP amount or the remaining balance, due on the booking day, *N* days after booking or *N* days before the event, with amounts counted as a *running total* or as *separate payments*) and an optional **approval rule** (the approving role from Role Management, the status shown while waiting, and whether the event is held until approved). A banner flags days‑ahead ranges no active policy covers or two policies share; each policy warns about due dates that fall before the booking day and schedules that may not collect the whole quote; the editor previews the schedule on a sample quote. Every new event is booked under the active policy for its date: its first payment becomes the required deposit, a booking that needs approval goes to **Approvals › Booking Approvals**, and the event can't be started or have stock released while it is on hold, not approved or behind on a payment (the event's **Payments** tab shows each payment as paid, due or overdue). A date no active policy covers can't be booked; rescheduling re-applies the policy. The approver role also needs the **Booking Approvals** permission (*catering_booking_approve*, Role Management) to see its bookings; the policy card warns when it doesn't. Editing needs *catering_settings_edit*; everyone else who can open the tab sees it read‑only.
- **Assets and Resources** — now its own screen in the top bar under **Operations → Assets and Resources**: **Staffing roles** (default rate, pay basis hourly / flat per event, critical), **Equipment catalog** and units, **Vehicles**, **Media vendors**, labour‑rate settings. The **All Costs** table lists every cost line with date and event filters.
- **Packages & Media** — the package catalog used by the public Packages page and the quote picker: name, description, category, branch scope, pricing mode (*itemised / per guest / flat*), min guests, active flag, **line items**, **equipment requirements** and **material requirements** (flat or per‑guest with divisor), usage counters. Media vendors are managed alongside.

  **Requirements readiness.** A banner at the top of the tab lists every *active* package that still has no equipment and/or material requirements, with a **Fix** button that opens that package for editing; each package card also carries a *No equipment reqs* / *No material reqs* chip. This matters because those two lists were added after the first packages were created: when they are empty, **Confirm & Start Operations** silently skips the automatic equipment reservation and material allocation for that event and the confirmation summary reads *"needs manual planning"*. Nothing breaks and no step is blocked — but staff must plan equipment and materials by hand. Before go‑live, clear the banner so every active package auto‑reserves. Note that a requirement pointing at a catalog item with no registered units resolves to a shortfall (*requested*), not a reservation.
- **Mail** — two sub-tabs. **Mail templates**: invitation subject/body (EN/AR) with placeholders *{{guest_name}} {{event_name}} {{when}} {{where}} {{seats}} {{link}}*; document e‑mail subject/body (EN/AR) with *{{client_name}} {{event_name}} {{event_date}} {{document_type}} {{total}} {{link}} {{brand_name}}*, used when emailing quotations and invoices. **Client Receipt**: the PDF receipt emailed to the client for an approved deposit, final balance or additional payment: automatic sending on Finance approval (by payment type), language (English, Arabic or both), sender name, email subject/message (EN/AR), header (title, logo side, accent colour, logo, business name and contact details, extra lines), body sections (client contact, event details, payment details, approval date, balance summary, payment history, signature), note and footer, with English and Arabic previews. Each approved payment in **Deposits & Payments** has a download button and **Email receipt / Resend receipt**, which asks for English or Arabic when automatic receipts are off for that payment type.

## 3.8 Daily checklist for a catering manager

1. **Approvals** — anything waiting? Verify declared deposits against the bank and decide **Booking Approvals**; check each event's **Payments** tab for overdue policy payments.
2. **Calendar** — conflicts this week?
3. **Shortfall Queue** — at‑risk lines → raise POs.
4. **Staffing** — unfilled critical roles for events in the next 7 days.
5. **Invitations** — RSVP stats for upcoming events.
6. After each event: Returned → Reconciliation → Staff Feedback.
`;