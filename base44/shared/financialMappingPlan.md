# Approved phased financial integration plan

Scope: preserve all existing workflows, chart IDs and posted history. Canonical target is FinanceJournal; FinanceLedgerLine remains a rebuildable reporting projection. Existing legacy integrations are unchanged until migrated deliberately.

## Phase 1A — mapping configuration vertical slice
- Company-scoped catalogue includes specification P01–P46, supplemental transaction patterns and dynamically discovered manual modules.
- Draft versions, multi-line account selection, allowlisted amount bases, exact-match conditions, dates, priorities and required dimensions.
- Side-effect-free deterministic decimal simulation; invalid accounts, imbalance, missing dimensions and tied overlapping rules block approval.
- Independent reviewer including for admins; immutable submitted definitions; history and existing exception queue.
- No new live posting: every catalogue adapter explicitly not_connected. Approval is configuration only.
- Existing finance permissions reused; mapping reads through authenticated company scope; direct entity writes restricted.

## Phase 1B delivered increment — controls, checks and recovery rehearsal
- Dated revision intervals used for conflict detection and resolution; historical simulations remain read-only after close, without allowing new closed-period definitions.
- Repeatable saved-fixture software checks, including mandatory dimensions, company branch, precision, account, negative and zero behavior. Accountant signoff remains separate.
- Durable company-scoped P01 catering-advance capture and retry, using server-read source revisions and fingerprints, explicit source-currency evidence and saved mapping previews.
- Changed sources retain their old capture and require a new revision. An interruption can be retried; interrupted company locks still require review.
- Recovery is a rehearsal, not publication. No existing financial postings, payment balances or stock movements are changed. Other source adapters and automatic capture remain deferred.

## Remaining Phase 1B — posting reliability and policy
- Durable financial-event capture, recovery, source revision checks and atomic subledger/journal publication design.
- Validate conditional company lock semantics and interruption/concurrency behavior. Multi-record transactions/unique constraints are not documented; do not assert full posting guarantees.
- Accountant-approved policies, tax and dimensions; controlled template import/export and robust fixture/coverage suites.
- Acceptance gate: concurrency, recovery, authorization, source-to-journal reconciliation and accountant signoff before live enablement.

## Phase 2 — event revenue and treasury
- Customer invoices, recognition, allocations, cancellation fees, separate credit notes/refunds, till/bank/gateway reconciliation.
- Adapter migration uses mapping snapshots; default rows alone never mean integration exists.

## Phase 3 — procurement and production
- Goods receipts/GRNI/AP, valuation layers, issues/WIP/output/staging/consumption, returns/waste and butchery.
- No duplicate quantity or cost postings. Missing valuation or conversion blocks, never zero.

## Phase 4 — labor, assets and customer schemes
- Payroll liabilities/settlement/reclassification, assets/depreciation/loss, supplier deposits, wallet/rewards/referrals.

## Phase 5 — reporting, closing and cutover
- Subledger reconciliations, daily/monthly close checklists, taxes/FX, authorized opening migration, historical replay exclusion, training/signoff.

Verification: focused backend simulation and denial cases; frontend production build. User-driven end-to-end UAT through Testing Agent, using specification U01–U20. No real refunds, test invoices or live journal changes during configuration rollout.