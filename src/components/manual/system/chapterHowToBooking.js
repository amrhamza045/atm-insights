export default `
# A. Booking, Quoting & Confirming

**Who does this:** catering manager, restaurant manager, call centre (and admins).
**Where:** header → **Catering**. Always pick your **branch** in the header first — every event, package and stock figure is branch-scoped.

> Rule of thumb: nothing operational happens until **Confirm & Start Operations** is pressed. Before that you are only selling.

## Book an event

1. Go to **Catering → Booking → Events**. Use the search bar above the event cards to find an event by any saved detail, including client, phone, venue, type, status or event code.
2. Press **New Event**.
3. **Client** — start typing the name or phone. Pick the existing client if it appears; if a duplicate warning shows, use the existing record instead of creating a second one. If they are new, press **Add client** and fill name, phone and (if you have it) e-mail.
4. **Event type** (wedding, corporate, birthday…) and **date + start time**. The duration/end is derived — adjust it if the event runs longer.
5. **Guests** — enter **expected guests**. Leave *guaranteed guests* empty for now; you set it later, together with the **guarantee cut-off date**, once the client commits. After the cut-off, billing locks to the guaranteed number.
6. **Location** — choose *on-site* (at the branch) or *off-site*. For off-site, fill venue name and address, and drop the pin on the map so logistics and staff get directions.
7. Fill what you know of **service style, theme, decoration, dress code** and the **on-site contact** (name + phone of whoever receives you at the venue).
8. **Special requests** — add one row per request: pick the kind (dietary, allergy, accessibility, beverage, other), write the detail, the guest reference and how many guests it affects, and tick **kitchen-critical** if the kitchen must act on it. Allergies always get ticked.
9. **Payment policy** — below the guest fields the form shows the payment policy for the chosen date (picked by how many days ahead the event is booked): its payment steps and whether the booking needs approval. If no active policy covers the date, the form says so and the event can't be booked — ask an admin to add one in **Settings → Payment Policies**.
10. Press **Book event**. The event is created with status **enquiry** under that policy and appears as a card in **Events**. It keeps a copy of the policy, so later edits to the policy don't change it. If the booking needs approval, the card shows the approval badge (e.g. *Awaiting approval*).

**Rescheduling:** saving a new date re-applies the payment policy for that date, and its due dates count from the day you reschedule. A message names the new policy when it changes; if no active policy covers the new date, the event can't move forward until one does.

**If the enquiry came in by itself:** enquiries submitted from the public **Packages** page already exist in **Events** as *enquiry*. Don't create a second one — open the existing card and complete the missing fields with steps 4–8.

**Working on one event:** click an event card to scope the workspace to it. An amber **"Scoped to: …"** badge appears in the header and every other tab now shows that event's data. Clear it with the ✕ when you're done.

## Create and send a quote

1. Scope to the event, then open **Catering → Booking → Quotes**.
2. Press **New Revision**. Each quote is a numbered revision; only one is **active** at a time, so you can re-quote freely without losing history.
3. Build the content — two ways, and you can mix them:
   - **From a package:** press **Add package**, pick one or more catalog packages. Line items are pulled in and quantities expand against the guest count. Leave the mode on **itemised** (the package price is spread across the visible lines, which is what clients expect to see) unless the client should only see one headline package line.
   - **Manually:** press **Add line item** → pick a **menu item** (cost comes from its recipe automatically) or **custom item** (type your own name, price and cost). Set **scaling**: *per guest* multiplies by the guest count, *fixed* is an absolute quantity.
4. Optional: **Additional charges** (delivery, setup, rental), and a **Discount** — choose *percent* or *amount*; percentages apply to the gross total (subtotal + tax + service). Give the revision a **variant label** like "Option B" if you're presenting alternatives.
5. Use the **tax / service exempt** toggles on lines that must not be charged tax or service. There are bulk switches at the top of the list.
6. Check the live totals panel: **subtotal, tax, service, total, required deposit, estimated cost, estimated margin**. If the margin looks wrong, the line **unit costs** are the place to look — a custom item with cost 0 will inflate margin.
7. If the client has a **catering credit limit** and this quote exceeds their exposure, a credit warning appears. You can override it, but the override is recorded on the quote with your name.
8. Press **Create revision** once. The button locks and shows **Saving…** until the revision is stored, preventing repeat clicks from creating duplicates; the new revision becomes active automatically.
9. Send it: on the active revision press **Email** (or **WhatsApp**). See *Email a catering document* for the send dialog.

**Re-quoting:** never edit a revision the client has already approved. Press **New Revision** — it copies the current one so you only change what moved.

### Egyptian premium pricing and portion baseline

The September 2026 calibration updated 30 menu items, 8 active catalog packages and 13 open, active quote revisions. Accepted revisions and the retired package were left unchanged. These are planning estimates informed by Egyptian retail and catering benchmarks, not guaranteed supplier offers; confirm actual supplier prices before purchasing.

Package headline prices per guest, before the quote's tax, service charge and discount: Economy Gathering **EGP 450**; Street Party **EGP 550**; Corporate Working Lunch **EGP 650**; Engagement Premium **EGP 850**; Ramadan Iftar **EGP 900**; Premium BBQ **EGP 950**; Royal Wedding and Seafood Alexandria **EGP 1,000** each.

Portions are shared across the dishes in each buffet, rather than assuming a full main-course serving of every dish for every guest. Quantities labelled per kg or per litre are weights or volumes; tray quantities represent fractions of a complete tray. Check whole-tray production rounding with the kitchen before release.

Existing production plans, reservations and release slips are not refreshed by a catalog or quote price update. If portions or recipes change after planning, have the catering approver review and recalculate the affected plan before purchasing or kitchen fulfillment; never treat the old slip as the revised demand.

## Take a deposit and get to confirmed

1. When the client accepts, the event moves to **quoted → deposit_pending** and a deposit is due: the payment policy's **first payment** (for example 50 % of the quote on the booking day). Events booked before payment policies keep their own Deposit %.
2. Open **Catering → Booking → Deposits & Payments**.
3. Press **Record payment** → type **deposit** → enter amount, **method** (cash, bank transfer, InstaPay, wallet, card), reference number, and attach the **proof** image if you have one.
4. Press **Record**. Every recorded deposit payment submits a receipt email to the **event customer's saved email** and the **staff member who recorded it**, including the event, payment amount/method/reference, total deposits received and remaining balance. As soon as recorded deposits meet the requirement, the event flips to **confirmed** automatically (a booking its payment policy holds until approved stays *deposit pending* until the approver approves it — see *Approve a booking*); on the payment that first reaches this threshold, **active Operations and Kitchen employees** are added to the notification. Duplicate addresses receive one message per payment. Portal declarations do not send until staff verifies and records the payment; refunds do not send. A missing customer email or failed send shows a warning without reversing the saved payment; do not record the payment again to retry an email. Non-registered recipients require a paid plan and a connected custom domain, and delivery remains subject to email-service checks.
5. **If the client paid from the portal:** they declare the transfer themselves and the event sits at **deposit_pending_verification**. No money is recorded yet. Open **Approvals** (or the transfer proof on **Deposits & Payments**), compare the uploaded proof against your bank/wallet statement, then **verify** — that is what records the payment. Never verify from the proof image alone.
6. Send the client their **deposit receipt** with the **Email** button on the payment row.

### Follow the payment schedule

On **Deposits & Payments**, an event booked under a payment policy shows a **Payment policy** card: the policy's name and when it was applied, then each payment step with its due date and the total that must be paid by then, marked **Paid**, **Due today**, **Overdue** or **Upcoming**. Collect each payment before its date. While the booking is on hold, wasn't approved or a payment is overdue, a red *Blocked by the payment policy* box says why, and **Confirm & Start** and stock release are refused until it's resolved. A deposit withdrawal can't take out money a payment step already requires.

## Approve a booking (payment policy)

**Who does this:** members of the role a payment policy names as its approver who hold the **Booking Approvals** permission (Admin → Role Management), and admins.

1. Open **Approvals → Pending**. The **Catering → Booking Approvals** queue lists the bookings waiting for you: event, date, client, guests, branch, the policy and how many days ahead it was booked. *On hold until approved* marks bookings that can't move forward meanwhile.
2. **Approve** — if the first payment is already in, the event is confirmed at once and its stock reservation goes to the manager for approval; otherwise it is confirmed as soon as the deposit is approved.
3. **Reject** — give the reason. The event can't be confirmed, started or have stock released. Rescheduling to a date under another policy applies that policy instead.

## Confirm and start operations

This is the gate between selling and operating. Requires status **confirmed** and an **active** quote. Needs the POS permission. It is refused while the booking is on approval hold, wasn't approved, or a payment under its payment policy is overdue — the message says which.

1. Open **Catering → Booking → Confirm & Start**.
2. Review the summary: client, **billable guests** (guaranteed if the cut-off passed, otherwise expected) and the quote totals. Fix anything wrong *now* — the quote locks in the next step.
3. Press **Confirm & Start Operations**. The system then, in one pass:
   - locks the active quote and **freezes the labour cost** with a per-role breakdown (so margin can be audited later);
   - moves the event to **in_progress**;
   - **reserves equipment** from the package's equipment requirements (flat or per-guest);
   - **allocates materials** — the package's material requirements plus every ingredient exploded from the menu-item recipes — against *free* stock, creating **reservations**. Anything not covered becomes a **shortfall** and is sent to procurement. Shortfalls never block confirmation;
   - **notifies assigned staff** in-app, once each.
4. Read the confirmation summary that appears. It has jump-links to whatever needs attention: **shortfalls**, **transport**, **staffing**. Work through them — see *Resolve a stock shortfall* and *Staff an event*.

## Cancel an event

1. Open the event in **Events** and press **Cancel event**.
2. Choose the reason. The **cancellation policy** (set per days-before in **Settings → Lists & Settings**) computes the penalty automatically.
3. The deposit is marked **retained / refundable / refunded** according to that penalty, and all equipment and material **reservations are released** back to free stock.
4. If a refund is owed, record it in **Deposits & Payments** as a **refund** payment once it has actually left the account.

## Permanently delete a clean enquiry

Use **Delete** only for a duplicate or abandoned clean enquiry. The app checks every linked catering record before allowing deletion. Events with completed payments, active/accepted quotes, committed stock, equipment, production, shared purchase orders or ledger postings are blocked — use **Cancel event** instead so operational commitments are released and financial history remains auditable.

For a clean event, review the itemized list of linked records that will be removed, tick the explicit confirmation, then press **Delete Event & Linked Records**. The system checks the blockers again immediately before deletion and removes the listed children with the event. Ledger entries are never cascade-deleted.

A read-only orphan scan runs every Monday at 08:00 Cairo time across all catering event links. Administrators receive the counts and record IDs by email and, where an employee profile is linked, in-app notification. The scan never changes or deletes data.
`;