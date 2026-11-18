import { useLocation, useNavigate } from "react-router-dom";
import useTrailPath from "@/lib/useTrailPath";
import { REPORT_PAGES } from "@/components/executive/reportCatalog";
import useScreenTabs from "@/hooks/useScreenTabs";
import { useModuleAccess } from "@/hooks/useModuleAccess";

// Executive Dashboard report in the address, with the path
// Executive Dashboard › page › report. Reports whose module is off, or that
// are closed in Admin › Modules, are left out; a page with none open disappears.
export default function useExecutiveTrail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useModuleAccess();
  const { isOpen } = useScreenTabs("ExecutiveDashboard");
  const ready = !isLoading;
  const groups = REPORT_PAGES
    .map((p) => ({ key: p.key, label: p.label, tabs: p.reports.filter((r) => isOpen(r.value)) }))
    .filter((g) => g.tabs.length > 0);
  const groupOf = (tab) => groups.find((g) => g.tabs.some((t) => t.value === tab));
  const homeTab = groupOf("summary") ? "summary" : groups[0]?.tabs[0].value;
  // The report period and comparison (ReportPeriodBar) stay in the address between reports.
  const params = new URLSearchParams(location.search);
  const urlFor = (tab) => {
    const next = new URLSearchParams();
    if (tab !== homeTab) next.set("tab", tab);
    ["period", "compare"].forEach((key) => params.get(key) && next.set(key, params.get(key)));
    const query = next.toString();
    return query ? `/ExecutiveDashboard?${query}` : "/ExecutiveDashboard";
  };
  const requested = params.get("tab");
  const activeTab = groupOf(requested) ? requested : homeTab;
  const group = groupOf(activeTab);
  const tab = group?.tabs.find((t) => t.value === activeTab);

  useTrailPath(ready && group ? [
    {
      label: "Executive Dashboard",
      url: "/ExecutiveDashboard",
      children: groups.map((g) => ({ label: g.label, url: urlFor(g.tabs[0].value) })),
    },
    { label: group.label, url: urlFor(group.tabs[0].value), children: group.tabs.map((t) => ({ label: t.label, url: urlFor(t.value) })) },
    { label: tab.label, url: urlFor(activeTab) },
  ] : []);

  const setActiveTab = (next) => { if (next !== activeTab) navigate(urlFor(next)); };
  return { ready, groups, activeGroup: group?.key, activeTab, activeReport: tab, setActiveTab };
}