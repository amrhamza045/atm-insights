# Phase 5 — Server-side checks report (2026-09-29)

Rule applied: every server action checks the caller's permission on the server; limits and values come from Settings.

## 1. Functions changed
| Function | Sensitivity | Check now on the server |
|---|---|---|
| syncPackageRename | High | catering_edit |
| allocateButcheryCosts | High | butchery_edit |
| processButcheryRework | High | butchery_edit |
| completeProductionOrder | High | manufacturing_view or manufacturing_edit |
| assignCustodyStages | High | catering_edit |
| exportProgramSummary | High | program_export_view |
| checkLowStockAndNotify | High | inventory_view / inventory_edit / inventory_manage; no-user refused |
| escalateCateringShortfalls | High | central admin; job guard (slot shortfall_escalation_hour) |
| emailDailyFinancialSummary | High | financial_view; job guard (slot daily_summary_hour) |
| syncPermissionCopy | High | unchanged for signed-in; no-user nightly = slot + once per slot; no-user record runs = accounts must exist + min gap; counts-only reply |
| reportCateringOrphans | Medium | catering_approve; job guard (orphan_scan_weekday + orphan_scan_hour) |
| escalateCustodyDelays | Medium | catering_approve; no-user refused |
| autoLowStockAlert | Medium | inventory_manage; no-user refused |
| exportAttendancePolicy | Medium | hr_view_all or hr_edit |
| generateInventoryWeightCompliance | Medium | inventory_view, including send_email; recipients only from Settings (no address from the request) |
| calculateFoodCosts | Medium | menu_edit or inventory_edit |
| getVendorContact | Low | unchanged (signed-in, read-only) |

Kept by decision: awardDeliveryBonus (linked driver or admin, no delivery_view).
Unchanged by decision: notifyReferralCashback*, notifyReferrerFirstPurchase, sendOrderStatusWhatsApp, sendWhatsAppMessage, captureWhatsAppLead, processPayoutCallback.
Customer/guest functions keep their ownership/token checks.

## 2. Job pattern (shared/jobGuard.js)
- Signed-in caller → job permission (or custom authorize). Schedule ticks: slot gate + once per slot (logged caller "schedule"). Manual "Run now": allowed, logged as manual (slot "manual:<hour>"), doesn't count against the slot.
- No user → body ignored, slot from Settings → Schedules, once per slot (JobRunLog), reply only done/skipped.
- Record-change, no user → record must exist; gap = ScheduleSettings.record_job_min_gap_minutes.

## 3. Hard-coded times
- Daily Financial Summary footer: "1:00 AM Cairo time" replaced by the send hour (Schedules → daily_summary_hour) and the company UTC offset (Timezone setting).
- No other hard-coded times/timezones/dates found in emails or messages. Frontend "formatCairo*" helpers already read the Settings offset (legacy names only).

## 4. Scheduled-run probe (ran 2026-09-29 12:29 UTC)
Scheduled calls carry a signed-in **admin** session (authorization header present, role admin).
Effect: scheduled runs take the signed-in path — permission passes, slot gate still applies (scheduled_tick), but "once per slot" and the reduced reply apply only to no-user calls. No-user paths remain the defense against unauthenticated direct calls.
Applied (sign-off follow-up): once-per-slot now also covers signed-in schedule ticks. Entity-trigger workflows likely carry the same identity, so the record-gap guard is mainly a no-user defense.

## 5. Tests
All changed functions tested as admin: permitted path reaches normal validation/output; off-slot schedule ticks return skipped.

## 6. Deferred
Cashier/POS (sendSMS, sendOrderWhatsApp, printNodeSilent, processVoiceNote, createReportShareLink) — proposed checks in phase5ApprovedChecks.md, not applied.
Probe function, its workflow and its job log entry deleted.

Final check: no screen sends scheduled_tick; only the four workflows do. There is no "Run now" button for the scheduled jobs. The only manual calls are syncPermissionCopy re-syncs (bulk / override / role change), which skip the slot. Fixed a gap: the signed-in nightly permission sync now also runs once per slot.

Phase 5 signed off. Phase 6 not started.