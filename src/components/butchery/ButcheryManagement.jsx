import React, { useState } from "react";
import { Beef, Truck, PawPrint, Boxes, Axe, Scissors, Package, Recycle, Search, BarChart3, Receipt } from "lucide-react";
import { Knife } from "@/components/icons/Knife";
import { RawMaterialTray } from "@/components/icons/RawMaterialTray";
import SupplierManager from "./SupplierManager";
import AnimalManager from "./AnimalManager";
import ProcessingBatchManager from "./ProcessingBatchManager";
import SlaughterEventManager from "./SlaughterEventManager";
import BreakdownManager from "./BreakdownManager";
import RawMaterialManager from "./RawMaterialManager";
import ReworkManager from "./ReworkManager";
import TraceabilityLookup from "./TraceabilityLookup";
import ButcheryReports from "./ButcheryReports";
import ExpenseManager from "./ExpenseManager";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";

const TABS = [
  { key: "suppliers", label: "Suppliers", component: SupplierManager, icon: Truck },
  { key: "animals", label: "Animals", component: AnimalManager, icon: PawPrint },
  { key: "batches", label: "Batches", component: ProcessingBatchManager, icon: Boxes },
  { key: "slaughter", label: "Slaughter", component: SlaughterEventManager, icon: Axe },
  { key: "breakdown", label: "Breakdown", component: BreakdownManager, icon: Knife },
  { key: "raw_materials", label: "Raw Materials", component: RawMaterialManager, icon: RawMaterialTray },
  { key: "rework", label: "Rework", component: ReworkManager, icon: Recycle },
  { key: "traceability", label: "Traceability", component: TraceabilityLookup, icon: Search },
  { key: "reports", label: "Reports", component: ButcheryReports, icon: BarChart3 },
  { key: "expenses", label: "Expenses", component: ExpenseManager, icon: Receipt },
];

export default function ButcheryManagement() {
  // Tabs closed in Admin › Modules are left out; a closed tab falls back to the first open one.
  const tabs = useScreenTabs("Butchery").keep(TABS);
  const [requestedTab, setActiveTab] = useState("suppliers");
  const activeTab = (tabs.find((t) => t.key === requestedTab) || tabs[0])?.key;
  const ActiveComponent = tabs.find((t) => t.key === activeTab)?.component;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
          <Beef className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Butchery</h1>
          <p className="text-sm text-slate-500">Full lifecycle tracking: animal to raw material SKU</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "border-red-600 text-red-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
          </button>
        ))}
      </div>

      {ActiveComponent ? <ActiveComponent /> : <ClosedTabsNotice />}
    </div>
  );
}