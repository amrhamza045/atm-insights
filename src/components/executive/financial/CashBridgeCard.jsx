import ReportCard from "@/components/executive/kit/ReportCard";
import Waterfall from "@/components/executive/kit/Waterfall";
import { METRICS } from "@/components/executive/metrics/metricDefinitions";

// How cash at the start of the period became cash at its end.
export default function CashBridgeCard({ data, className }) {
  const c = data.current;
  const steps = [
    { label: "Opening cash", value: c.opening_cash, total: true },
    { label: "Cash received", value: c.cash_received },
    { label: "Cash paid out", value: -c.cash_paid },
    { label: "Opening balances", value: c.opening_added },
    { label: "Closing cash", value: c.closing_cash, total: true },
  ];
  return (
    <ReportCard
      title="Cash bridge"
      info={{
        calculation: "Cash at the start of the period, plus cash received, minus cash paid out, plus cash opening balances entered in the period, gives cash at period end. Moves between the company's own cash and bank accounts change nothing, and a void is taken off the receipt or payment it undoes.",
        source: METRICS.closing_cash.source,
      }}
      className={className}
    >
      <Waterfall steps={steps} currency={data.company.currency} />
    </ReportCard>
  );
}