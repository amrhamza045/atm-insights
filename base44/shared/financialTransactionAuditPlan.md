# Financial transaction audit and recovery

Approved placement: a separate Transaction Audit group beside Reporting under Finance.

- [x] Inspect existing Finance source, routing, approval and ledger-index controls.
- [x] Add exhaustive paginated audit browsing for registered financial source types, with explicit coverage and no sampled-success claims.
- [x] Link posted operational journals, Finance journals, pending proposals and recorded posting errors without duplicate source representations.
- [x] Reuse live operational, catering and sales/purchasing routing with exact preview and confirmed retry; never activate unsupported adapters by saving a draft rule.
- [x] Prepare source-linked one-time journals with independent review, immutable source evidence, amount checks and duplicate guards.
- [x] Confirm recovery only after posted journal and reporting lines are verified.
- [x] Add navigation, permission-aware controls, source filters, empty/loading/error states, regression tests and build verification.

Scope: registered sources with explicit branch ownership. Financial operational journals are covered regardless of originating module. Direct sources without a live adapter remain explicitly labeled; one-time correction is supported where a verified amount exists. New automatic adapters for these sources are deferred, not fabricated from account labels. Payouts without branch ownership and documents without a verified financial valuation cannot be automatically assigned to a company.