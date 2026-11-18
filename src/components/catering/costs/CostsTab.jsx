import React, { useState } from "react";
import { Coins, Wrench, Users, Truck } from "lucide-react";
import AllCostsTable from "./AllCostsTable";
import EquipmentCostsTab from "../EquipmentCostsTab";
import StaffingCostsTab from "../StaffingCostsTab";
import LogisticsCostsTab from "../LogisticsCostsTab";
import GlobalCostFilter, { EMPTY_FILTER } from "./GlobalCostFilter";
import { useAllocations } from "./useAllocations";
import { useCateringSettings } from "../useCateringSettings";
import useTabTrail from "@/lib/useTabTrail";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";

const VIEWS = [
  { key: "all", label: "All", icon: Coins },
  { key: "equipment", label: "Equipment", icon: Wrench },
  { key: "staffing", label: "Staffing", icon: Users },
  { key: "logistics", label: "Logistics", icon: Truck },
];

export default function CostsTab() {
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const { eventOptions } = useAllocations(filter);
  const { logisticsEnabled } = useCateringSettings();
  // Views closed in Admin › Modules (or Role Management) are hidden.
  const views = useScreenTabs("AssetsResources").keep(logisticsEnabled ? VIEWS : VIEWS.filter((v) => v.key !== "logistics"));
  // Kept in the address, so Back / Forward, Recent and the path bar follow the view.
  const [activeView, setView] = useTabTrail(views, { fallback: "all" });

  if (!views.length) return <ClosedTabsNotice />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeView === v.key ? "bg-white text-warning-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <v.icon className="w-4 h-4" />
              {v.label}
            </button>
          ))}
        </div>
        <GlobalCostFilter filter={filter} onChange={setFilter} events={eventOptions()} />
      </div>

      {activeView === "all" && <AllCostsTable filter={filter} />}
      {activeView === "equipment" && <EquipmentCostsTab filter={filter} />}
      {activeView === "staffing" && <StaffingCostsTab filter={filter} />}
      {activeView === "logistics" && logisticsEnabled && <LogisticsCostsTab filter={filter} />}
    </div>
  );
}