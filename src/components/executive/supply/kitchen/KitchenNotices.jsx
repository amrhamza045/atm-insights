import { Link, useLocation } from "react-router-dom";
import ReportNotice from "@/components/executive/kit/ReportNotice";

// What the Kitchen report leaves out of some figures, and where kitchen waste is.
export default function KitchenNotices({ data: d }) {
  const { search } = useLocation();
  const waste = new URLSearchParams(search);
  waste.set("tab", "stockwaste");
  return (
    <>
      {!d.has_activity && <ReportNotice>No production batches were finished in this period.</ReportNotice>}
      {d.unclocked > 0 && <ReportNotice>{d.unclocked} batch(es) were started and finished within a minute, or never started, so they're left out of prep time. Prep time only counts when Start is pressed on the Head Chef board as the work begins.</ReportNotice>}
      {d.no_recipe > 0 && <ReportNotice>{d.no_recipe} batch(es) were made from a recipe that no longer exists, so they're left out of yield and cost against the recipe.</ReportNotice>}
      <p className="text-xs text-slate-500">
        Kitchen waste is reported in <Link to={`/ExecutiveDashboard?${waste}`} className="font-medium text-navy underline underline-offset-2">Stock & Waste</Link>, so it isn't counted here.
      </p>
    </>
  );
}