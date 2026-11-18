import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";

const WHY_NOT = {
  indexing: "Finance is adding newly posted entries to its reports. This updates by itself in a few seconds.",
  no_company: "Finance has no company for this selection yet, so there's no ledger to compare with.",
  no_accounts: "No accounts are mapped for this in Finance › Mapping Accounts yet, so there's no ledger balance to compare with.",
  inventory_off: "Inventory accounting isn't switched on for this company, so finished batches post nothing to the ledger. It's switched on in Finance › Mapping Accounts › Inventory lifecycle & COGS.",
  inventory_later: "Inventory accounting starts after this period, so these batches aren't posted to the ledger.",
};

// An operational total beside the posted ledger's figure for the same thing,
// as of today unless `when` names the period, and what to look at when they
// differ. ledger: { available, reason, company, balance, operational }.
export default function LedgerCheckCard({ title, info, label, ledgerLabel, ledger, currency, gapNote, when = "As of today" }) {
  const gap = ledger.available ? Math.round((ledger.operational - ledger.balance) * 100) / 100 : null;
  const stats = [[label, ledger.operational], [ledgerLabel, ledger.available ? ledger.balance : null], ["Difference", gap]];
  return (
    <ReportCard title={title} info={info} subtitle={`${when}${ledger.company ? ` · ${ledger.company}` : ""}`}>
      <dl className="grid grid-cols-3 gap-3">
        {stats.map(([name, value]) => (
          <div key={name} className="rounded-xl bg-cream px-3 py-2">
            <dt className="text-[11px] text-slate-500">{name}</dt>
            <dd className="truncate font-semibold tabular-nums text-navy">{fmtValue(value, "money", currency)}</dd>
          </div>
        ))}
      </dl>
      {!ledger.available && <p className="mt-3 text-xs text-slate-500">{WHY_NOT[ledger.reason] || WHY_NOT.no_company}</p>}
      {gap !== null && (Math.abs(gap) < 1
        ? <p className="mt-3 text-xs text-success-700">The two agree.</p>
        : <p className="mt-3 text-xs text-warning-800">{gapNote}</p>)}
    </ReportCard>
  );
}