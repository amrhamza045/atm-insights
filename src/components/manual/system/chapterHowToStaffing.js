export default `
# C. Staffing, Equipment & Transport

**Who does this:** catering manager, restaurant manager, HR for the payroll side.
**Where:** **Catering → Planning & Prep** (Staffing, Equipment, Logistics).

## Staff an event

1. Scope to the event, then open **Catering → Planning & Prep → Staffing**.
2. **Staffing requirements** are seeded from the guest count and event type — roles × how many of each. If the saved guest count changes, press **Suggest from … guests** again to recalculate from the latest event details; any deliberate extra headcount above the previous suggestion is retained. To adjust a count, type the complete number and press **Enter** or click outside the field; it saves once after you finish instead of saving every digit. Add missing roles and tick **critical** on the roles the event cannot run without (they drive the coverage warnings).
3. Press **Assign Staff** on a role. The list is **match-scored** for you — skills, catering events worked, and largest event handled — so the most suitable people are at the top. You can still pick anyone.
4. Set **call time** and **release time** (call time defaults to the event start minus setup). **Expected hours**, the **rate** and the **estimated cost** fill in from the employee's rate, or the role's default rate for freelancers.
5. Choose the **check-in location** for that person: **branch** (they clock in at the branch and travel with the team) or **event site** (they clock in at the venue). Mixing both across an event is fine — it shows as hybrid attendance.
6. If the person is already booked that day you'll be blocked. A manager can **override** the double-booking, but must type a reason — it is stored on the assignment.
7. **Confirm** the assignments. Confirming creates a **Shift** for each person (that's what attendance and payroll run on) and notifies them in-app, once.
8. Watch the **coverage cards** until every critical role is filled. The **labour cost card** includes assigned people only; vacant suggested slots are shown separately as indicative and never increase the client’s event price. The assigned cost stays live while planning and freezes after **Confirm & Start Operations**.
9. To swap someone out, **release** the assignment and assign a replacement. A released person who is later re-added is a new assignment, so they get notified again.

## Reserve equipment

1. Open **Catering → Planning & Prep → Equipment** with the event scoped.
2. Requirements from the package are already reserved if you have run **Confirm & Start Operations**. Add anything extra with **Reserve equipment** → pick the catalog item → pick the specific **units** (each has its own code).
3. Conflicts with other events on the same date are shown — resolve them by moving units between events or renting in.
4. Check the **equipment cost card** (depreciation-based) if you're watching the event margin.
5. Plan any **maintenance** that must happen before the date, and after the event log the **returns** with condition — that is what releases the units for the next booking.

## Move equipment to the venue (trips & custody)

Only if the **Logistics** module is enabled in **Settings → Lists & Settings**.

1. Open **Catering → Planning & Prep → Logistics** with the event scoped.
2. Press **New trip** → pick the **vehicle** and **driver**, set **departure** and expected **return**, and select the **equipment loaded**.
3. Build the **chain of custody**: choose a **different custodian where needed for every handoff**, then save the full chain together. Use **Assign people** later to replace the person on any pending stage.
4. Each custodian is notified in-app and by email, then opens **My Custody** on their own phone, counts the items and **confirms only their stage**. Confirmation alerts the next custodian that the equipment is ready; any missing item is flagged there, not discovered at the venue.
5. Delays are escalated automatically by a daily job, so an unconfirmed stage will surface without you chasing it.
6. On the way back, log the **trip return** and then the equipment returns in the **Equipment** tab.

## Rate staff after the event

1. Open **Catering → Event Day → Staff Feedback** (needs the discount/finance permission).
2. Rate each assigned person and add a note.
3. Ratings feed the staffing analytics and improve the **match score** next time you assign that role — so do it while the event is fresh.
`;