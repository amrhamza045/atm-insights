import ReportCard from "@/components/executive/kit/ReportCard";
import Waterfall from "@/components/executive/kit/Waterfall";
import { fmtHours } from "@/components/executive/kit/formatters";
import { MAKEUP_INFO } from "./laborConfig";

// How the months' pay adds up, from base salaries to the net paid.
export default function PayMakeupCard({ makeup: m, currency }) {
  const steps = [
    { label: "Base salaries", value: m.base },
    { label: "Hourly pay", value: m.hourly },
    { label: "Overtime pay", value: m.overtime },
    { label: "Late & early", value: -m.docked },
    { label: "Gross pay", value: m.gross, total: true },
    { label: "Bonuses", value: m.bonus },
    { label: "Payroll cost", value: m.cost, total: true },
    { label: "Penalties", value: -m.penalties },
    { label: "Advances recovered", value: -m.advances },
    { label: "Other deductions", value: -m.other },
    { label: "Net paid", value: m.net, total: true },
  ];
  return (
    <ReportCard title="What pay is made of" subtitle={`${fmtHours(m.hours)} worked, ${fmtHours(m.overtime_hours)} of them overtime`} info={MAKEUP_INFO}>
      {m.cost > 0 ? <Waterfall steps={steps} currency={currency} /> : <p className="py-6 text-center text-sm text-slate-500">No payroll was run for the period's months.</p>}
    </ReportCard>
  );
}