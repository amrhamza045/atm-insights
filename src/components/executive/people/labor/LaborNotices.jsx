import { format, parseISO } from "date-fns";
import ReportNotice from "@/components/executive/kit/ReportNotice";

const monthName = (m) => format(parseISO(`${m}-01`), "MMMM yyyy");
const joined = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0]);

// The months Labor Cost leaves out, and what it can't set against revenue.
export default function LaborNotices({ data: d }) {
  const missing = d.months.missing.map(monthName);
  return (
    <>
      {!d.has_activity && <ReportNotice>No payroll has been run for any month of this period yet. Labor Cost counts whole months once HR › Payroll has run them.</ReportNotice>}
      {d.has_activity && missing.length > 0 && (
        <ReportNotice>No payroll has been run yet for {joined(missing)}, so {missing.length > 1 ? "those months are" : "that month is"} left out: Labor Cost counts whole months that have been run.</ReportNotice>
      )}
      {d.not_paid > 0 && <ReportNotice>{d.not_paid} payroll record(s) of these months aren't marked paid yet; they count at their calculated amounts.</ReportNotice>}
      {d.revenue_reason === "no_company" && <ReportNotice>Finance has no company for this selection yet, so payroll can't be set against revenue.</ReportNotice>}
    </>
  );
}