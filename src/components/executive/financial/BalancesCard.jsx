import { Link } from "react-router-dom";
import ReportCard from "@/components/executive/kit/ReportCard";
import KpiCard from "@/components/executive/kit/KpiCard";
import { missingText, FINANCE_MAPPING_URL } from "@/components/executive/kit/compareNotes";

const events = (n) => `${n} completed ${n === 1 ? "event" : "events"} · as of today`;

// What the company owes suppliers at period end and, with Catering on, what
// customers still owe and have paid ahead, as of today.
export default function BalancesCard({ data }) {
  const { suppliers, customers, comparison, company } = data, currency = company.currency;
  return (
    <ReportCard
      title="Balances"
      subtitle={customers.available ? "Owed to suppliers at the end of the period; catering balances as of today" : "Owed to suppliers at the end of the period"}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {suppliers.mapped ? (
          <KpiCard metric="owed_suppliers" value={suppliers.current} previous={suppliers.previous} compareLabel={comparison.label.toLowerCase()} missing={missingText(comparison)} currency={currency} />
        ) : (
          <p role="status" className="col-span-2 rounded-2xl border border-warning-200 bg-warning-50 p-4 text-xs text-warning-800 lg:col-span-1">
            Set the supplier payables account in{" "}
            <Link to={FINANCE_MAPPING_URL} className="font-medium underline underline-offset-2">Finance › Mapping Accounts</Link> to see what is owed to suppliers.
          </p>
        )}
        {customers.available && (
          <>
            <KpiCard metric="held_unpaid" value={customers.held_unpaid} missing={events(customers.held_unpaid_events)} currency={currency} />
            <KpiCard metric="balance_due" value={customers.balance_due} missing="As of today" currency={currency} />
            <KpiCard metric="deposits_held" value={customers.deposits_held} missing="As of today" currency={currency} />
          </>
        )}
      </div>
    </ReportCard>
  );
}