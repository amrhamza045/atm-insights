# Phase 4 — Approved access-rule baseline (approved 2026-09-29)

Reference document only; no code imports it. This is the approved baseline for testing and for future phases. It was taken from the rules saved on each record on 2026-09-29, after the D1–D8 decisions. If a record's saved `rls` (in `base44/entities/`) differs from this file, treat that as a change that needs approval.

Key:
- **A** = platform role `admin` OR `perm_is_central_admin = true`.
- **x[B]** = permission x, limited to the user's branch: (x AND `perm_has_branch = false`) OR (x AND record `branch_id` = user's `perm_branch_id`).
- **own(f)** = the record's field f equals the signed-in user's matching value.
- **SR** = service role only; no user can do this directly, only server functions.
- Permission names drop the `perm_` prefix.

## 1. Permissions & roles
| Record | Read | Create | Update | Delete |
|---|---|---|---|---|
| UserPermissions | A; own(`user_email` = email) | A | A | A |
| Role | A; `perm_has_role` (account holds a staff role) | A | A | A |
| AuditLog | A; `cashier_audit` | platform `admin`; own(`admin_email` = email) | SR | SR |
| PermissionSyncLog | A | SR (written by `syncPermissionCopy` only) | SR | SR |

## 2. Payroll & HR
| Record | Read | Create | Update | Delete |
|---|---|---|---|---|
| Employee | A; own(`email`); `hr_view`[B]; `hr_edit`[B]; `hr_approve`[B]; `catering_view`[B] | A; `users_manage`; `hr_edit`[B] | A; `users_manage`; `hr_edit`[B] | A; `hr_edit`[B] |
| EmployeePrivate | A; `hr_edit` | SR | SR | SR |
| SalaryRecord | A; own(`employee_id` = `perm_employee_id`); `hr_view`[B]; `hr_edit`[B] | A; `hr_edit`[B] | A; `hr_edit`[B] | A; `hr_edit`[B] |
| SalaryPenalty | same as SalaryRecord | same | same | same |
| EmployeeBorrowing | same as SalaryRecord | same | same | same |
| DeliveryBonusRecord | A; `hr_view`; `hr_edit`; own(`delivery_person_id` = `perm_delivery_person_id`) | A; `hr_edit` | A; `hr_edit` | A; `hr_edit` |
| Attendance | A; own(`employee_id`); `hr_view`[B]; `hr_edit`[B]; `hr_approve`[B]; `catering_view`[B] | A; `hr_edit`[B]; `hr_approve`[B] | A; `hr_edit`[B]; `hr_approve`[B] | A; `hr_edit`[B] |
| Shift | A; own(`employee_id`); `hr_view`[B]; `hr_edit`[B]; `hr_approve`[B]; `catering_view`[B] | A; `hr_edit`[B]; `catering_edit`[B] | A; `hr_edit`[B]; `catering_edit`[B] | A; `hr_edit`[B] |
| AttendancePolicy | A; `hr_view`; `hr_edit`; `hr_approve` | A; `hr_edit`; `settings_edit` | A; `hr_edit`; `settings_edit` | A; `hr_edit` |
| DeliveryPerson | A; own(`email`); own(`id` = `perm_delivery_person_id`); `hr_view`[B]; `hr_edit`[B]; `cashier_view`[B]; `cashier_edit`[B] | A; `hr_edit`[B] | A; `hr_edit`[B] | A; `hr_edit`[B] |

## 3. Finance
| Record | Read | Create | Update | Delete |
|---|---|---|---|---|
| Expense | A; `finance_view`[B]; `cashier_view`[B] | A; `cashier_edit`[B]; `finance_edit`[B] | A; `finance_edit`[B]; `admin_operations`[B]; `cashier_audit`[B] | A; `finance_edit`[B] |
| CashierPurchase | same as Expense | same | same | same |
| CashierSession | A; `finance_view`[B]; `cashier_view`[B]; own(`cashier_id` = user id) | A; `cashier_edit`[B] | A; own(`cashier_id`) AND `status` = open; `finance_edit`[B] | A; `finance_edit`[B] |
| Deposit | A; `finance_view`[B]; `cashier_view`[B] | A; `cashier_edit`; `finance_edit` | A; `finance_edit` | A; `finance_edit` |
| VisaCredit | A; `finance_view`; `cashier_view` | A; `cashier_edit`; `finance_edit` | A; `finance_edit` | A; `finance_edit` |
| Purchase | A; `finance_view`; `admin_actions`; `admin_systems`; `purchases_approve`; own(`client_id` = `perm_client_id`) | A; `admin_actions`; `purchases_approve`; `cashier_edit`; `finance_edit` | A | A |
| ButcheryExpense | A; `finance_view`; `butchery_view`; `butchery_edit` | A; `butchery_edit`; `finance_edit` | A; `butchery_edit`; `finance_edit` | A; `butchery_edit`; `finance_edit` |
| BalanceRecharge | A; `finance_view`; `admin_actions`; `admin_operations`; own(`client_id`) | A; `admin_actions` | A; `admin_actions`; `admin_operations` | A |
| Payout | A; `finance_view`; `admin_actions`; `admin_operations`; `admin_systems`; own(`client_id`) | A | A; `admin_actions`; `admin_operations` | A |
| JournalEntry | A; `finance_view`[B] | A; `finance_edit`[B] | SR | SR |
| GLAccount | A; `finance_view` | SR | SR | SR |
| DailyFinancialSummary | A; `finance_view`[B] | SR | SR | SR |
| CateringPayment | A; `catering_view`[B]; own(`client_id` = `perm_portal_client_id`) | SR | SR | SR |
| SharedReportLink | SR | SR | SR | SR |

Clients create payouts and balance recharges through `submitPayoutRequest` and `submitBalanceRechargeRequest`, which run as the service role.
Still open, to be handled separately: cashier access on Purchase (approved read with `cashier_view` isn't saved yet).

## 4. Settings
| Record | Read | Create | Update | Delete |
|---|---|---|---|---|
| SystemSettings | every signed-in user | A; `settings_edit` | A; `settings_edit` | A; `settings_edit` |
| EmailNotificationSettings | A; `settings_edit` | A; `settings_edit` | A; `settings_edit` | A; `settings_edit` |
| ReportRecipientSettings | A; `settings_edit` | A; `settings_edit` | A; `settings_edit` | A |
| ScheduleSettings | A; `settings_edit` | A; `settings_edit` | A; `settings_edit` | A |
| VendorSupportInfo | SR | SR | SR | SR |

## 5. Decisions recorded (2026-09-29)
- Kept: BalanceRecharge and Payout delete are Admin only; BalanceRecharge create allows `admin_actions` (for the admin Recharges screen); the extra read permissions on Purchase (`admin_systems`, `purchases_approve`) and on Payout (`admin_systems`) stay.
- Changed: Purchase create now also allows `finance_edit`.
- Review point 1 — PermissionSyncLog: read by Admin and central admin; written only by the sync (service role). Changed.
- Review point 2 — Role read: Admin, central admin and accounts holding a staff role (`perm_has_role`); clients and guest accounts can't read it. Changed.
- Review point 3 — EmployeePrivate: kept `hr_edit` (plus Admin / central admin) for reads; `hr_view` users don't see salary, ID or bank fields. Kept.
- Bulk admin tools (Data Clone import, Go-Live Cleanup, Bulk Delete Test Data) re-sync every account's permission copy when they finish if they touched UserPermissions, Role, Employee, DeliveryPerson or Client.
- Purchase update/delete: kept Admin only. No finance screen or function updates or deletes purchases. The only writers are admin data tools (Data Clone, Go-Live Cleanup, Bulk Delete Test Data) and service-role functions (`mergeClients`, `manageCateringEventDeletion`). The saved rule doesn't limit the service-role functions.
- Deferred: all cashier-related rules on Purchase.