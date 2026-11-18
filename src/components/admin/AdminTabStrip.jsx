import React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

// Sub-header order per admin section. Sections not listed render as one flat list.
export const SECTION_GROUPS = {
  settings: [
    "Business Setup",
    "Regional & Format",
    "Comms Config",
    "Access Control",
    "Loyalty Program Config",
    "Kitchen & Inventory",
    // Former Systems section, now shown inside Settings.
    "Client Data",
    "Order & Guest Ops",
    "Loyalty Ops",
    "Marketing & Outreach",
    "Maintenance",
    "Data Management",
  ],
};

const SECTION_BG = {
  settings: "bg-emerald-50",
  operations: "bg-blue-50",
  pos: "bg-slate-50",
  cashier: "bg-red-50",
  inventory: "bg-orange-50",
  purchases: "bg-slate-50",
  hr: "bg-teal-50",
};

function TriggerList({ tabs, bg, activeClass }) {
  return (
    <TabsList className={`border shadow-sm w-full h-auto flex-wrap justify-start ${bg}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <TabsTrigger key={`${tab.id}-${tab.section}`} value={tab.id} className={`gap-2 ${activeClass || ""}`}>
            <Icon className="w-4 h-4" />
            {tab.label}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}

/**
 * Renders the admin tab strip. When the section defines sub-headers, tabs are
 * split into one TabsList per sub-group so Radix keeps a valid roving tab index
 * inside each list (arrow keys move within a group, Tab moves between groups).
 */
export default function AdminTabStrip({ tabs, section, activeClass }) {
  const bg = SECTION_BG[section] || "bg-purple-50";
  const groups = SECTION_GROUPS[section];

  if (!groups) return <TriggerList tabs={tabs} bg={bg} activeClass={activeClass} />;

  return (
    <div className="space-y-2">
      {[...groups, "Other"].map((group) => {
        const groupTabs = tabs.filter((t) => (t.group || "Other") === group);
        if (groupTabs.length === 0) return null;
        return (
          <div key={group} className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-1">{group}</p>
            <TriggerList tabs={groupTabs} bg={bg} activeClass={activeClass} />
          </div>
        );
      })}
    </div>
  );
}