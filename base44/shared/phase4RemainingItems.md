# Phase 4 — Remaining items (3, 5, 6)

Saved word for word as given by the owner on 2026-09-29. Reference only — not imported.

Item 3 — Guest emails
Any email triggered by a guest (RSVP, referral, public pages) must read the notification settings on the server, not in the browser, because guests can no longer read email notification settings. List every guest-triggered email that exists, move its settings check to the server, and confirm each one still sends.

Item 5 — Hard-coded values, then the numeric pass
Rule: don't hard-code any configuration (branch IDs or names, emails, amounts, percentages, schedules, or default values). The system must read these from the Company/Branch tab or the relevant settings screen.
Move each item from your audit list to its settings screen:
- Bulk branch reassignment: a branch picker instead of the hard-coded branch
- POS combo drink: a "disable combo drink" switch on each offer instead of hard-coded offer IDs
- Schedules (07:00 shortfall escalation, 08:00 Monday orphan scan, 03:00 permission sync, the daily summary email time): a schedule section in settings, using the existing timezone setting
- Test cashback page defaults: read from cashback tiers and payout settings
- Timezone default: read from timezone settings
- Contact emails: read from Company info
Then do the second pass for numeric values (amounts, percentages, rates, limits, time windows) and move each one to settings. List them all in the report.

Item 6 — The full Phase 4 report
- The final rule for every record in all four groups (permissions and roles, payroll and HR, finance, settings), with every condition listed
- EmployeePrivate: fields moved and who can read them
- The labor-cost totals function and the dashboards switched to it
- The new server functions in Phase 4 and what each checks
- The hard-coded values moved, with where each one lives now
- Where receipts, payment proofs, shared reports and QR images are stored, and who can open them
- Any old public links that still exist and can't be disabled
- Any role that lost access, and whether that's intended
- Anything that broke and how you fixed it
- How to roll back Phase 4
- Test steps for our testing team, covering all four groups
- Go-live checklist, including: fill in the Vendor / Support info tab (support email, website, mobile) while signed in as the safety-valve account. Until then the manual footers leave those lines out.