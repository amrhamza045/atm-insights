# Phase 5 — Approved server-side checks (approved 2026-09-29)

Rule: every server action checks the caller's permission on the server. No limits or values in code — all come from settings.

## Role holders (checked before applying)
| Permission | Roles holding it |
|---|---|
| butchery_edit | super_admin only (no role holds butchery_view alone, so nobody who opens the Butchery screen loses access) |
| manufacturing_edit | super_admin, admin, manager, head_kds_kitchen |
| manufacturing_view (no edit) | inventory_manager → completeProductionOrder accepts manufacturing_view OR manufacturing_edit, same as the screen that shows it |
| catering_edit | staff, officer, manager, admin, super_admin (+ 2 user overrides) |

## a) Staff actions — to apply
| Function | Sensitivity | Check |
|---|---|---|
| syncPackageRename | High | catering_edit |
| awardDeliveryBonus | High | linked driver or admin, **and** delivery_view (admin bypass) |
| allocateButcheryCosts | High | butchery_edit |
| processButcheryRework | High | butchery_edit |
| completeProductionOrder | High | manufacturing_view or manufacturing_edit (matches screen gate) |
| assignCustodyStages | High | catering_edit |
| exportProgramSummary | High | program_export_view |
| exportAttendancePolicy | Medium | hr_view_all or hr_edit |
| generateInventoryWeightCompliance | Medium | inventory_view (also for send_email — recipients only from Settings → Report Recipients; no address accepted from the request) |
| calculateFoodCosts | Medium | menu_edit or inventory_edit |
| getVendorContact | Low | signed-in (read-only footer text) — unchanged |

Already checked, unchanged: see Phase 5 report.

## b) Scheduled / service-only jobs — "safe to run with no user"
Shared guard `base44/shared/jobGuard.js`:
- Signed-in caller → must hold the job permission. Schedule tick (scheduled_tick) → slot gate + once per slot (JobRunLog, caller "schedule"). Manual "Run now" → allowed, logged as caller "user", reason "manual", slot "manual:<hour>", does not count against the slot.
- No user → body ignored, slot from Admin → Settings → Schedules, once per slot (JobRunLog), response only `{done}` / `{skipped}`.
- Record-change jobs with no user → record id must exist; minimum gap per record = ScheduleSettings.record_job_min_gap_minutes (default 0); response only counts.

| Job | Sensitivity | Permission for signed-in callers | Slot |
|---|---|---|---|
| escalateCateringShortfalls | High | central admin (unchanged) | shortfall_escalation_hour |
| emailDailyFinancialSummary | High | financial_view | daily_summary_hour |
| syncPermissionCopy | High | users_manage or self (unchanged) | nightly: permission_sync_hour; record changes: gap |
| checkLowStockAndNotify | High | inventory_view / inventory_edit / inventory_manage | none (anonymous refused) |
| reportCateringOrphans | Medium | catering_approve | orphan_scan_weekday + orphan_scan_hour |
| recomputeCateringActualCosts | Medium | catering_approve or catering_finance (unchanged) | record changes: gap |
| escalateCustodyDelays | Medium | catering_approve | none (not scheduled; anonymous refused) |
| autoLowStockAlert | Medium | inventory_manage | none (not scheduled; anonymous refused) |
| notifyReferralCashback | Medium | unchanged this phase (called by other functions) |  |
| generateDailyFinancialSummary, generateDeliveryComplianceReport | Medium | already permission-checked, unchanged | |

## Left unchanged this phase (by decision)
notifyReferralCashbackWhatsApp, notifyReferrerFirstPurchase, sendOrderStatusWhatsApp, sendWhatsAppMessage, captureWhatsAppLead, processPayoutCallback.

## c) Customer portal / guest — keep ownership / token checks
claimPortalAccess, decideCateringQuote, declareCateringDeposit, getPortalEventServiceCosts, submitPayoutRequest, submitBalanceRechargeRequest, notifyPayoutRequest, getReferralPurchaseStats, rsvpInvitation, submitCateringReferral, openSharedReport, checkEmailSetting, ingestSocialLead.

## d) Cashier / POS — deferred (proposed checks, not applied)
| Function | Proposed |
|---|---|
| sendSMS | pos_edit (settings_edit for test send) |
| sendOrderWhatsApp | pos_edit or orders_manage |
| printNodeSilent | pos_print or cashier_print |
| processVoiceNote | pos_edit |
| createReportShareLink | + cashier_view |
| updateCashierSession, recordSessionRecharge | already checked |

## e) Test case — "Drift self-heals" (revised)
A tampered permission copy is corrected with resolver-true values and logged as "Copy differed before: Yes":
- **Layer 1 — next app open** (trigger `app_open`): any app open (fresh login, session resume, reopened tab) re-syncs the user's own copy once.
- **Layer 2 — next server action** (trigger `action_check`): any permission-checked server action re-checks the caller at most once per `action_heal_throttle_minutes` (default 180); writes only on mismatch; never blocks the action.
- Sign-in (`sign_in`) remains a redundant path; nightly sweep and record-change syncs unchanged.
Pass criteria: tamper a `perm_*` field → open the app → Sync log shows an `App open (self-heal)` row with "Yes: <fields>".