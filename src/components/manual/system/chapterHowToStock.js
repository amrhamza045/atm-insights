export default `
# B. Stock Shortages & Ordering

**Who does this:** catering manager raises it, inventory manager / purchaser approves and receives it.
**Where:** **Catering → Planning & Prep → Shortfall Queue**, then **Purchases Hub** and **Inventory**.

> Only **free stock** counts. Free stock = quantity on hand − everything already reserved for *other* events, with a minimum of zero. An older event can use all available stock, but its backlog is never added to the new event's order quantity. Repeated lines for the same material share the remaining stock instead of counting it twice.

## Resolve a stock shortfall

1. After **Confirm & Start Operations**, open **Catering → Planning & Prep → Shortfall Queue**. It lists every reservation, across all events, that free stock could not cover.
2. Read each line: **item**, **quantity short**, **needed-by date**, **event**, and the **procurement status** (*none → po_pending → po_approved → po_delivered*, or *po_cancelled*).
3. Deal with the **at-risk** flags first. A line is flagged at-risk when the days left until *needed-by* are fewer than the item's **procurement lead time** — meaning a normal order will not arrive in time. An automated job re-evaluates this every day, so the flag is always current.
4. Decide how to cover each line:
   - **Order it** — the normal path, continue at step 5.
   - **It's already ordered** — link the existing purchase order to the shortfall so the queue stops chasing it.
   - **Substitute or re-quote** — if it can't arrive in time, change the quote (a new revision) or swap the menu item, then re-confirm. Talk to the client before changing what they bought.
5. Raise the order. Two ways:
   - **One event, quickly:** on the shortfall line press **Raise PO** and pick the supplier. Use this for a single item or a single event.
   - **Several lines / several events at once:** open **Catering → Planning & Prep → Planning** and press **Generate Purchase Cart**. Choose one event or a date range — the cart collects every shortfall in scope, groups the lines by supplier and creates one purchase order per supplier. Review quantities and prices, remove anything you don't want, then **finalise the cart**.
6. The purchase order is created as **recommended** (a draft suggestion) and the shortfall's procurement status becomes **po_pending**. It is **not** approved yet, and no stock has moved.
7. Chase it through approval and receiving — steps below. The shortfall is only truly resolved when the status reads **po_delivered**.

**Unmapped lines:** if the cart shows lines it couldn't map to an inventory item, that menu item has no recipe or the recipe references nothing stocked. Fix the recipe in **Menu Management** (or add the item to **Inventory**) and regenerate.

## Approve a purchase order

Needs the *purchase approve* permission — and the approver must not be the person who raised it.

1. Go to **Purchases Hub → Purchase Orders**.
2. Open the order. Catering-triggered orders are flagged with the **event name** and a **needed-by date**, and show **urgent** when they're blocking an imminent event — do those first.
3. Check each line: quantity, purchase unit, unit price, supplier and the current stock snapshot. Approve or reject **per line** if only some lines are justified.
4. Press **Approve**. The shortfall's procurement status becomes **po_approved**. **Stock still has not moved** — approval is permission to buy, nothing more.
5. Send the order to the supplier and confirm the delivery date against the needed-by date. If the supplier can't make it, tell the catering manager immediately so they can re-quote.

## Receive goods and clear the shortfall

1. When the goods physically arrive, go to **Purchases Hub → Purchase Invoices** (or press **Record purchase** on the order).
2. Enter what actually arrived — **received quantity in the selling unit**, the real invoice price, **expiry date for every received batch**, invoice number and date. Count it; do not copy the ordered quantity.
3. **Process the invoice.** This is the only step that moves stock: quantities are added to **Inventory**, the received expiry date is copied to the item and its Expiry record, average cost is updated, the linked shortfall becomes **po_delivered**, and the purchased event is removed from **Purchases Hub → Recommended Cart**.
4. To review completed carts, open **Purchases Hub → Recommended Cart** and press **History** in the top-right. This replaces the active event list with previously purchased carts; press **Back to current carts** to return.
5. Reopen **Shortfall Queue** and confirm the line has cleared. If it partially arrived, the remainder stays short — raise a top-up order or re-quote.
5. If part of the delivery is unusable, declare it in **Inventory → Waste** (reason *damaged* / *spoiled*) instead of quietly reducing the count, so the cost lands where it belongs.

## Check stock before you promise it

Do this *while quoting*, not after confirming.

1. Open **Inventory** (or **Inventory Hub**) for the branch and use the search bar above the cards. It matches every saved item detail, including name, category, supplier, units, stock, cost and expiry date.
2. Compare **quantity on hand** with what other confirmed events have reserved — **Catering → Planning & Prep → Planning** shows the requirement list for your event, and the **Shortfall Queue** shows what is already committed elsewhere.
3. Check the item's **lead time** and **expiry date**. A long lead time on a short-notice event is a shortfall you can predict before selling it. The latest processed purchase invoice normally supplies the cost; a newer reviewed market estimate temporarily takes priority until another invoice is processed.
4. For a recipe-based menu item, remember one quote line explodes into several raw materials — the requirement list in **Planning** is the reliable view, not your own arithmetic.

## Low stock and expiry, day to day

1. **Inventory → Low Stock** lists everything under its threshold; an automated alert also notifies when enabled in **Admin → Settings**.
2. From Low Stock you can create **draft purchase orders** in bulk for the normal (non-catering) replenishment cycle.
3. **Expiry Reports** — new inventory items and received purchase batches are added automatically from their required expiry dates. Review items approaching or past expiry and resolve them (use, discount or waste). Anything reserved for a catering event that is about to expire needs the catering manager told, since the reservation looks covered but the stock isn't usable.
4. **Waste declarations** need approval; until approved the cost is not booked.
`;