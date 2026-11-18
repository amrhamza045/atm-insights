# Phase 4 — Finance group: approved rules (records 1–7)

Saved word for word as approved by the owner on 2026-09-28. Reference only — not imported.

Admin and central admin are allowed on every rule. "Branch pattern" means: permission AND perm_has_branch = no, OR permission AND record's branch = perm_branch_id. For records with no branch field, use the permission only, with no branch check.

1. Expense, CashierPurchase
- Read: finance_view or cashier_view (branch pattern)
- Create: cashier_edit or finance_edit (branch pattern)
- Update: finance_edit, admin_operations or cashier_audit (branch pattern)
- Delete: finance_edit (branch pattern)
(Option A is done: Pending Approvals shows only to finance_edit or admin_operations; "Mark as paid" only to cashier_audit or finance_edit.)

2. CashierSession
- First move the recharge screens' update of the open cashier session into a server function that checks admin_actions, then updates the session with elevated access
- Read: finance_view or cashier_view (branch pattern), plus cashiers reading their own sessions (cashier_id = their login ID)
- Create: cashier_edit (branch pattern)
- Update: cashiers update only their own open session; finance_edit updates any (branch pattern)
- Delete: finance_edit (branch pattern)

3. Deposit, VisaCredit
- Read: finance_view or cashier_view (branch pattern for Deposit; permission only for VisaCredit, which has no branch field)
- Create: cashier_edit or finance_edit
- Update / delete: finance_edit

4. Purchase (no branch field)
- Read: finance_view, cashier_view, admin_actions, and clients reading their own purchases. Tell me which field links a purchase to the client's account, and use it for the own-record rule
- Create: cashier_edit (POS), admin_actions (Orders and Purchases), finance_edit
- Update / delete: finance_edit or admin_actions
- The cashback repair function must save with elevated access after its purchases_approve check
- Tell me what the Dashboard page creates and under which permission, before applying

5. ButcheryExpense (no branch field)
- Read: finance_view, butchery_view or butchery_edit
- Create / update / delete: butchery_edit or finance_edit

6. BalanceRecharge
- Client requests go through a server function that forces the status to pending and validates the amount. Clients can't create or edit these records directly
- Read: finance_view, admin_actions, admin_operations, and clients reading their own requests
- Update: admin_actions or admin_operations
- Delete: finance_edit

7. Payout
- Client requests go through a server function that forces the status to pending and rejects any amount above the client's available balance. Clients can't create or edit these records directly
- Read: finance_view, admin_actions, admin_operations, and clients reading their own requests
- Update: admin_actions or admin_operations; the payment-file function keeps its payouts_approve check and elevated write
- Delete: finance_edit

When the finance group is done, stop and report:
- Where the rules file is saved
- The final rule for each of the 13 records, with every condition listed
- The new server functions (session update, recharge requests, payout requests) and what each checks
- Any role that lost access, and whether that's intended
- Anything that broke and how you fixed it
- How to roll back this group

Then wait for me to say "continue with settings".