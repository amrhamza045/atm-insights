import ReportCard from "@/components/executive/kit/ReportCard";
import StatTile from "../StatTile";
import { REFERRALS_INFO } from "./leadsConfig";

const FIGURES = [["lead_new", "Referral leads", "number"], ["lead_converted", "Converted", "number"], ["lead_booked", "Booked", "number"], ["lead_booked_value", "Value booked", "money"]];

// Guest referrals: their leads and what became of them, then the commissions
// earned, paid and still owed (for people with financial viewing permission).
export default function ReferralsCard({ referrals: r, comparison, currency }) {
  const c = r.commissions;
  return (
    <ReportCard title="Guest referrals" info={REFERRALS_INFO} subtitle={`Changes against the ${comparison.label.toLowerCase()}`}>
      <dl className="grid grid-cols-2 gap-3">
        {FIGURES.map(([key, label, format]) => <StatTile key={key} label={label} format={format} value={r.current[key]} previous={r.previous?.[key]} currency={currency} />)}
      </dl>
      {c ? (
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <StatTile label="Commission earned" format="money" goodWhen="none" value={c.earned} previous={c.earlier_earned} currency={currency} />
          <StatTile label="Commission paid" format="money" goodWhen="none" value={c.paid} previous={c.earlier_paid} currency={currency} />
          <StatTile label="Commission owed" format="money" value={c.owed} note="As of today" currency={currency} />
        </dl>
      ) : <p className="mt-3 text-xs text-slate-500">Commission amounts are shown to people with financial viewing permission.</p>}
    </ReportCard>
  );
}