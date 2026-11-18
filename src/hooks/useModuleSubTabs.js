import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { subTabsOf } from "@/lib/screenTabs";

// Each module's tabs and sub-tabs, from the one list in screenTabs.js plus the
// Admin tabs. Station screens (KDS, Kitchen & Bar Manual) get one tab per
// active preparation area. Used by Admin › Modules, Roles and Users alike.
export default function useModuleSubTabs(modules, adminTabs) {
  const { data: stations = [] } = useQuery({
    queryKey: ["modulePrepAreas"],
    queryFn: async () => (await base44.entities.PreparationArea.list("sort_order")).filter((a) => a.is_active !== false),
  });
  return useMemo(
    () => Object.fromEntries(modules.map((m) => [m.key, subTabsOf(m.key, { adminTabs, stations })])),
    [modules, adminTabs, stations]
  );
}