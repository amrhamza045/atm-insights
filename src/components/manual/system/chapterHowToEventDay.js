import actualCosts from './chapterActualCosts';

export default `
# E. Event Day & Closing Out

**Who does this:** catering manager on the day, finance for the closing figures.
**Where:** **Catering → Event Day** (Execution, Returned, Reconciliation).

## Prepare production before the day

1. Scope to the event and open **Catering → Planning & Prep → Planning**.
2. Review the **requirement list** derived from the active quote — finished items to pull from stock and items to produce.
3. Press **Generate production plan**. This creates the catering **production batches** the kitchen works from, with the raw materials committed to each.
4. Any material the plan can't cover appears in the **Shortfall Queue** — handle it as in *Resolve a stock shortfall*.
5. Check **special requests** marked *kitchen-critical* are on the run-sheet, allergies especially.

## Run the event day

1. Open **Catering → Event Day → Execution** with the event scoped. This is the run-sheet.
2. Work top to bottom and mark progress as it happens:
   - **production batches** completed;
   - **trips** departed and returned (assign every handoff custodian together on the Equipment tab; each person receives a notification and confirms only their stage from **My Custody**, which alerts the next custodian);
   - **staff clocked in** — chase anyone missing against the Staffing coverage;
   - **special requests** acknowledged.
3. Note the **actual guest count** that turned up — you need it for reconciliation.
4. Anything that goes wrong (breakage, shortfall at the venue, a no-show) gets logged as it happens, not from memory afterwards.

## Log returned items

1. After the event, open **Catering → Event Day → Returned**.
2. For each item coming back from the venue enter the **quantity**, **condition** and **reason**. Usable food and materials go back to stock; damaged goods do not.
3. Log equipment returns in **Planning & Prep → Equipment** so the units are freed for the next booking.
4. Being honest here is what makes the event's cost and the next event's stock correct.

## Reconcile and close the event

1. Open **Catering → Event Day → Reconciliation**.
2. Enter the **actual guests**. Billing uses the **guaranteed** count if the guarantee cut-off has passed — actual guests below the guarantee are still billed at the guarantee.
3. Enter **actual consumption** against what was reserved. Differences show as variance for the margin report.
4. Add any **credit note** or adjustment the client agreed (a shortfall in service, an item not delivered). Note the reason — it shows on the document.
5. Review the final figures: total billed, payments received, **balance due**, actual cost and margin.
6. Press **Finalise**. This produces the **final invoice** and moves the event to **completed**.
7. **Email** the final invoice from the same tab (see *Email a catering document*) and record the closing **balance payment** in **Booking → Deposits & Payments** when it arrives.
8. Finish with **Staff Feedback** while the event is still fresh.

## After closing — where the numbers show up

- **Executive Dashboard → Catering** — event and package P&L, venue and event-type profitability, cost variance, loss analysis, Catering Staffing (staffing cost) and Equipment & Returns (equipment depreciation and returned items). How the kitchen's production batches ran (on time, prep time, yield and cost against the recipe) is under **Cost & supply → Kitchen Performance**.
- **Operations → Assets and Resources → All** — every cost line with date and event filters.
- Catering revenue is reported **separately** from POS revenue in the daily financial summary, so neither is double-counted.

## Daily checklist for a catering manager

1. **Approvals** — anything waiting? Verify declared deposits against the bank.
2. **Calendar** — conflicts this week (same venue, double-booked staff or equipment)?
3. **Shortfall Queue** — at-risk lines → raise or chase POs.
4. **Staffing** — unfilled critical roles for events in the next 7 days.
5. **Invitations** — RSVP stats for upcoming events.
6. After each event: **Returned → Reconciliation → Staff Feedback**.

${actualCosts}
`;