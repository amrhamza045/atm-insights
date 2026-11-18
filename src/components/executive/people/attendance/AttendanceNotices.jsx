import { Link, useLocation } from "react-router-dom";
import ReportNotice from "@/components/executive/kit/ReportNotice";

// An empty period, and where event staffing is reported.
export default function AttendanceNotices({ data: d }) {
  const { search } = useLocation();
  const staffing = new URLSearchParams(search);
  staffing.set("tab", "cateringstaffing");
  return (
    <>
      {!d.has_activity && <ReportNotice>No clock-ins were recorded in this period.</ReportNotice>}
      <p className="text-xs text-slate-500">
        This report covers every shift. Event staffing, coverage and staff ratings are in <Link to={`/ExecutiveDashboard?${staffing}`} className="font-medium text-navy underline underline-offset-2">Catering Staffing</Link>.
      </p>
    </>
  );
}