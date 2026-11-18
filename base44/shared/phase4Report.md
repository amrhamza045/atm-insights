# Phase 4 — Final report (2026-09-29)

Reference document only — not imported by any code.
For the exact current access rule of every record, the source of truth is that record's schema under
`base44/entities/`. `base44/shared/phase4RlsSnapshot.js` (and `phase3RlsSnapshot.js` for rollback) holds the rules captured for this phase.

---

## 1. Access rules by group (regenerated 2026-09-29 from the saved rules)

Read directly from each record's saved `rls` block, not from memory. The earlier version of this table was wrong in several places (e.g. it listed `users_manage` on UserPermissions and `hr_view_all` on EmployeePrivate); this version replaces it.

Key: **A** = platform role `admin` OR `perm_is_central_admin`. **[B]** after a permission = branch pattern (permission AND no branch, OR permission AND record `branch_id` = user's `perm_branch_id`). **own(x)** = record field x equals the signed-in user's value. **SR** = service role only (no user can touch it directly; only server functions).

### Permissions & roles
| Record | Read | Create | Update | Delete |
|---|---|---|---|---|
| UserPermissions | A; own(`user_email`) | A | A | A |
| Role | A; `perm_has_role` (staff accounts only) | A | A | A |
| AuditLog | A; `cashier_audit` | A; own(`admin_email`) | SR | SR |
| PermissionSyncLog | A | SR (sync only) | SR | SR |
| User permission copy (`perm_*` on User) | Written only by `syncPermissionCopy` with the resolver's result | | | |

### Payroll & HR
| Record | Read | Create | Update | Delete |
|---|---|---|---|---|
| Employee | A; own(`email`); `hr_view`[B]; `hr_edit`[B]; `hr_approve`[B]; `catering_view`[B] | A; `users_manage`; `hr_edit`[B] | A; `users_manage`; `hr_edit`[B] | A; `hr_edit`[B] |
| EmployeePrivate | A; `hr_edit` | SR | SR | SR |
| SalaryRecord, SalaryPenalty, EmployeeBorrowing | A; own(`employee_id`); `hr_view`[B]; `hr_edit`[B] | A; `hr_edit`[B] | A; `hr_edit`[B] | A; `hr_edit`[B] |
| DeliveryBonusRecord | A; `hr_view`; `hr_edit`; own(`delivery_person_id`) | A; `hr_edit` | A; `hr_edit` | A; `hr_edit` |
| Attendance | A; own(`employee_id`); `hr_view`[B]; `hr_edit`[B]; `hr_approve`[B]; `catering_view`[B] | A; `hr_edit`[B]; `hr_approve`[B] | same as create | A; `hr_edit`[B] |
| Shift | A; own(`employee_id`); `hr_view`[B]; `hr_edit`[B]; `hr_approve`[B]; `catering_view`[B] | A; `hr_edit`[B]; `catering_edit`[B] | same as create | A; `hr_edit`[B] |
| AttendancePolicy | A; `hr_view`; `hr_edit`; `hr_approve` | A; `hr_edit`; `settings_edit` | same as create | A; `hr_edit` |
| DeliveryPerson | A; own(`email`); own id = `perm_delivery_person_id`; `hr_view`[B]; `hr_edit`[B]; `cashier_view`[B]; `cashier_edit`[B] | A; `hr_edit`[B] | A; `hr_edit`[B] | A; `hr_edit`[B] |

### Finance
| Record | Read | Create | Update | Delete |
|---|---|---|---|---|
| Expense, CashierPurchase | A; `finance_view`[B]; `cashier_view`[B] | A; `cashier_edit`[B]; `finance_edit`[B] | A; `finance_edit`[B]; `admin_operations`[B]; `cashier_audit`[B] | A; `finance_edit`[B] |
| CashierSession | A; `finance_view`[B]; `cashier_view`[B]; own(`cashier_id` = user id) | A; `cashier_edit`[B] | A; own(`cashier_id`) AND status = open; `finance_edit`[B] | A; `finance_edit`[B] |
| Deposit | A; `finance_view`[B]; `cashier_view`[B] | A; `cashier_edit`; `finance_edit` | A; `finance_edit` | A; `finance_edit` |
| VisaCredit | A; `finance_view`; `cashier_view` | A; `cashier_edit`; `finance_edit` | A; `finance_edit` | A; `finance_edit` |
| Purchase | A; `finance_view`; `admin_actions`; `admin_systems`; `purchases_approve`; own(`client_id`) | A; `admin_actions`; `purchases_approve`; `cashier_edit`; `finance_edit` | A | A |
| ButcheryExpense | A; `finance_view`; `butchery_view`; `butchery_edit` | A; `butchery_edit`; `finance_edit` | same | same |
| BalanceRecharge | A; `finance_view`; `admin_actions`; `admin_operations`; own(`client_id`) | A; `admin_actions` (clients go through `submitBalanceRechargeRequest`) | A; `admin_actions`; `admin_operations` | A |
| Payout | A; `finance_view`; `admin_actions`; `admin_operations`; `admin_systems`; own(`client_id`) | A (clients go through `submitPayoutRequest`) | A; `admin_actions`; `admin_operations` | A |
| JournalEntry | A; `finance_view`[B] | A; `finance_edit`[B] | SR | SR |
| GLAccount | A; `finance_view` | SR (`saveGLAccount`) | SR | SR |
| DailyFinancialSummary | A; `finance_view`[B] | SR | SR | SR |
| CateringPayment | A; `catering_view`[B]; own(`client_id` = `perm_portal_client_id`) | SR | SR | SR |
| SharedReportLink | SR | SR | SR | SR |

### Settings
| Record | Read | Create | Update | Delete |
|---|---|---|---|---|
| SystemSettings | every signed-in user | A; `settings_edit` | A; `settings_edit` | A; `settings_edit` |
| EmailNotificationSettings | A; `settings_edit` | A; `settings_edit` | A; `settings_edit` | A; `settings_edit` |
| ReportRecipientSettings | A; `settings_edit` | A; `settings_edit` | A; `settings_edit` | A |
| ScheduleSettings | A; `settings_edit` | A; `settings_edit` | A; `settings_edit` | A |
| VendorSupportInfo | SR | SR | SR | SR |

### Differences from the approved rules
Compared with `phase4FinanceRules.md` (records 1–7; Admin and central admin are allowed on every rule). `phase4RemainingItems.md` doesn't state any access rules, and there is no approved rules file for the permissions & roles, payroll & HR or settings groups, so those groups can't be compared. Nothing has been changed yet.

| # | Record | Operation | Approved | Saved | Difference |
|---|---|---|---|---|---|
| D1 | Purchase | Read | finance_view, cashier_view, admin_actions, own client | finance_view, admin_actions, **admin_systems**, **purchases_approve**, own client | `cashier_view` missing; `admin_systems` and `purchases_approve` extra |
| D2 | Purchase | Create | cashier_edit, admin_actions, finance_edit | cashier_edit, admin_actions, **purchases_approve** | `finance_edit` missing; `purchases_approve` extra |
| D3 | Purchase | Update | finance_edit or admin_actions | Admin only | `finance_edit` and `admin_actions` missing |
| D4 | Purchase | Delete | finance_edit or admin_actions | Admin only | `finance_edit` and `admin_actions` missing |
| D5 | BalanceRecharge | Create | Not stated for staff (clients only via server function) | `admin_actions` | Extra staff create not in the approval (used by Admin → Recharge submit). Please confirm |
| D6 | BalanceRecharge | Delete | finance_edit | Admin only | `finance_edit` missing |
| D7 | Payout | Read | finance_view, admin_actions, admin_operations, own client | also **admin_systems** | `admin_systems` extra |
| D8 | Payout | Delete | finance_edit | Admin only | `finance_edit` missing |

**Decisions (2026-09-29):**
- D2 fixed: Purchase create now allows `finance_edit`.
- D3/D4 kept Admin only, because no screen or function edits or deletes purchases apart from admin data tools and service-role functions.
- D5, D6, D7, D8 and the extra read permissions in D1 kept as they are.
- Cashier access on Purchase (the rest of D1/D2) is deferred.
- The approved baseline is now `phase4ApprovedRules.md`.

Matching the approval exactly: Expense, CashierPurchase, CashierSession, Deposit, VisaCredit, ButcheryExpense, and the create/update rules of BalanceRecharge and Payout (apart from D5).
Review points (decided 2026-09-29, recorded in `phase4ApprovedRules.md` §5):
- PermissionSyncLog: now read by Admin and central admin; written only by the sync. Changed.
- Role: now read only by Admin, central admin and staff accounts (`perm_has_role`). Changed.
- EmployeePrivate: kept `hr_edit` only; `hr_view` doesn't see the sensitive fields. Kept.

Permission-copy incident (2026-09-29): between 10:43 and 11:00 UTC every sync failed because the schedule check wasn't imported into `syncPermissionCopy`. Hany's role and branch change (10:57, from the Users screen) ran into this, so his copy was left stale until the full re-sync at 11:00. Fixed: the import was added, and a sync that crashes now writes a failed entry to the Permission Sync Log. Bulk tools that skipped the per-record triggers now re-sync when they finish: Data Clone import (it was the only one using bulk writes on UserPermissions/Client/Employee/DeliveryPerson), Go-Live Cleanup and Bulk Delete Test Data (Client).

## 2. EmployeePrivate
The sensitive employee fields (salary, national ID, bank details, personal phone and address) are in EmployeePrivate. The saved rule allows direct reads for Admin, central admin and `hr_edit`. All writes go through `saveEmployeePrivate` (SR). `hr_view` users and everyone else get the Employee record without these fields.

## 3. Labor-cost totals
`getLaborCostTotals` works out labor totals on the server, so salary rows never reach the browser. The Executive Labor Cost dashboard (`useLaborCostTotals`) and the Insights staff section use it.

## 4. New server functions in Phase 4
| Function | Checks |
|---|---|
| getLaborCostTotals | `financial_view` or Admin |
| saveEmployeePrivate | `hr_edit` or Admin |
| syncPermissionCopy | Signed-in non-managers may only sync themselves; `users_manage` for others; writes resolver values only |
| checkEmailSetting | Public; returns only whether one named guest notification is on |
| createReportShareLink / openSharedReport | Create: `cashier_view` or Admin. Open: valid, unexpired token |
| voidCateringPayment | Catering finance permission; rejects a void that would leave net paid below the credit notes issued |
| getVendorContact / saveVendorContact | Get: signed in. Save: safety-valve account only |
| Scheduled-job gate (`shared/scheduleGate.js`) | Runs a job only at the hour/day saved in settings; skips when the timezone or the time is not set |

## 5. Hard-coded values moved
| Value | Was | Now lives in |
|---|---|---|
| Bulk branch reassignment branch | Fixed branch ID | Branch picker (branch list) |
| Combo drink disable | Fixed offer IDs / option names | Offer switch "Disable combo drink" + option flag "Is combo drink" |
| Shortfall escalation 07:00 | Cron | Admin → Settings → Timezone → Automatic job schedules |
| Orphan scan Monday 08:00 | Cron | same card |
| Permission sync 03:00 | Cron | same card |
| Daily Financial Summary time | Not scheduled | same card (starting value 08:00 — choose your time) |
| Custody delay 2 h | Code | same card (numbers) |
| Default material lead time 2 days | Code | same card (numbers) |
| Default low-stock threshold 10 | Code (two functions) | same card (numbers) |
| Payout % fallback 50 | Code (two cashback repair functions) | Payout settings only; the functions stop with a message if it's not set |
| Self-cashback fallback 15 % | Code | Client's registration level, or the default level |
| Default registration level | Level name in code | "Default" switch on the level |
| Timezone default Cairo | Code | Timezone settings (no fallback) |
| Vendor contact (manuals) | Code | Vendor / Support info tab |
| Report recipients & share-link days | Code | Report recipients card |
| Test cashback page | Hard-coded defaults | Page removed |

Numeric values reviewed and left in code on purpose: `|| 1` minimum quantities/party sizes (checks that values are valid, not business settings); list sizes; the 1–90-day limit on share-link days.
| Catering staff expected hours 6 | Code (`populateCateringActualSources`) | same card: "Catering staff: default expected hours" |
| Catering staff minimum hours 2 | Code | same card: "Catering staff: minimum hours worked" |
| Catering staff start 12:00 | Code | same card: "Catering staff: default start hour" (now company time; was stored as 12:00 UTC) |

Still in code: the 20:00 default end time in the same function. It's only a label on generated shifts, because hours come from the start time plus hours worked.

Seed / migration scripts: none exist in the app. Data Clone and Go-Live Cleanup only work on existing records and contain no configuration.

## 6. Day boundaries (company timezone)
Fixed to use the company timezone: the Daily Financial Summary (email and on-demand), catering shortfall escalation ("today"), the delivery compliance report date, and the Daily Sales report grouping. The inventory weight compliance report and the catering reports already used it.
Second pass (2026-09-29), now using the company timezone:
- Attendance clock-in/out and manual check-in requests: "today" is the company day. Both stop with a clear message if the timezone isn't set.
- Payout withdrawal limits: daily, weekly (Sunday start) and monthly, both on the server (`submitPayoutRequest`) and in the client's preview.
- Payment file names (server) use the company date.
- Attendance screens, shift screen, Financial dashboard, Executive summary "today": default dates use the company day.
- Financial Management, F&B Analytics, All Sales, Direct Financials, Delivery Company Financials: records are grouped by company day, and the default ranges start on the company day.
- Payroll, Salary Calculator, Attendance dashboard: month end was calculated in local time and then converted to UTC. In Cairo that made the month end one day early, so **the last day of each month was left out of payroll**. Fixed.
- Catering staff start times (see section 5).

Checked and left as they are: date-entry defaults on butchery, purchasing, invoice, waste, hire-date and cashier-session forms. They already use the device clock or can be edited, and they only differ between 00:00 and 02:00/03:00 Cairo time. Also: download file names, the traffic and website-visitor charts, and the older chart helpers (`insightsMetrics`, `inventoryPresets`, `wasteTrend`, `ManufacturingAnalytics`). Any of these can be switched with the same helpers later.

## 7. Where files are stored
| File | Storage | Who can open |
|---|---|---|
| Catering payment proofs, portal transfer proofs | Private | Staff with catering access; the portal customer for their own event; short-lived link made when opened |
| Cashier, purchase and expense receipts | Private | Same permissions as the record; short-lived link |
| Talabat receipt scans | Private | POS/cashier staff; fresh link at print or view time |
| Shared session reports (WhatsApp) | Private + SharedReportLink token | Anyone with the link until it expires (Report recipients → days) |
| QR entry passes | Generated on the pass page from the guest's token; not stored as files | Holder of the RSVP link |
| Offer images, logos | Public (by design, shown on the menu) | Anyone |

## 8. Old public links
Receipts uploaded before Phase 4 kept their public URLs, and those can't be switched off after the fact. Most are test data. Deleting the test records during Go-Live Cleanup removes the references, but not the files.

## 9. Access removed
- Guests can no longer read email notification settings. This is intended; `checkEmailSetting` covers it.
- Non-HR staff no longer see salary or ID fields on employees. Intended.
- Staff with `settings_edit` but not Admin can't delete report recipients or job schedules. Intended.

## 10. Broken and fixed
- Guest RSVP and referral emails failed after the settings lock. They now check on the server.
- The void-payment guard allowed inconsistent balances. It now compares net paid with credit notes.
- The "yesterday" boundary was in UTC, so a Cairo day was split 2–3 hours off. Now uses company time.
- `payout_percent = 0` was silently treated as 50 in the cashback repair functions. Removed.
- Payroll and attendance month views dropped the last day of the month in Cairo time. Fixed (section 6).
- The access-rule tables in the first version of this report were written from memory. They have been regenerated from the saved rules.

## 11. Rollback
1. Restore each changed record's `rls` from `phase3RlsSnapshot.js` by rewriting its schema.
2. Revert the functions and workflows through version history (backend → this date). Delete the `ScheduleSettings` record, and put the workflow cron times back: 07:00, Monday 08:00, 03:00.
3. EmployeePrivate: data stays there. Only copy it back into Employee if you also restore the old Employee rule.
4. Files uploaded privately stay private. Viewers need the Phase 4 components to open them.

## 12. Test steps
Permissions & roles: change a role's permission → the user's access updates within a minute; a non-manager calling a sync for another account → refused.
Payroll & HR: clock in at 01:00 Cairo → the record is dated that Cairo day; run payroll for a month with attendance on its last day → that day is counted; an `hr_edit` user sees salary and ID; a cashier opening Employees doesn't see them; the Labor Cost dashboard totals match the payroll run.
Finance: a cashier in branch A can't see branch B expenses; void a payment that has a credit note larger than the remaining paid amount → refused; share a closed session over WhatsApp → the link opens, then stops after the expiry days.
Settings: a guest RSVP still emails the pass; a non-admin without `settings_edit` can't save settings; set the summary time to the next hour → the email arrives once, for yesterday in company time; clear the timezone → jobs skip with a message.

## 13. Go-live checklist
- [ ] Set the company timezone (Admin → Settings → Timezone). Until then every scheduled job fails and shows as failed in its run log.
- [ ] Review the job times on the "Automatic job schedules & settings" card (shortfall 07:00, orphan scan Monday 08:00, permission sync 03:00).
- [ ] Choose the Daily Financial Summary send time (currently 08:00 as a starting value).
- [ ] Check the numeric job settings on the same card (custody delay 2 h, lead time 2 days, low-stock 10, catering staff 6 h expected / 2 h minimum / start 12).
- [x] Access-rule differences D1–D8 decided (baseline in `phase4ApprovedRules.md`); cashier access on Purchase still open.
- [x] Decide the three review points in section 1 (PermissionSyncLog, Role read, EmployeePrivate for `hr_view`). Closed 2026-09-29.
- [x] Scheduled jobs confirmed running (permission sync, shortfall escalation, orphan scan, daily summary email); nightly permission sync entry present in the sync log.
- [x] Bulk admin tools re-sync permissions when they finish.
- [ ] Note: attendance clock-in and payout requests with limits now stop if the company timezone is cleared (currently set to UTC+02:00).
- [ ] Set the payout percentage in Payout settings.
- [ ] Mark exactly one registration level as Default.
- [ ] Fill in the report recipients.
- [ ] Fill in the Vendor / Support info tab (support email, website, mobile) while signed in as the safety-valve account. Until then the manual footers leave those lines out.
- [ ] Run Go-Live Cleanup to remove test data (and its old public receipt links).