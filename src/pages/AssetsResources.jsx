import React from "react";
import { Coins } from "lucide-react";
import CostsTab from "@/components/catering/costs/CostsTab";

// Equipment, staffing and logistics resources shared by every catering event.
// Opened from the Operations menu; the route guard checks catering_view and
// the Assets and Resources module (which closes with Catering).
export default function AssetsResources() {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <Coins className="w-5 h-5 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Assets and Resources</h1>
      </div>
      <CostsTab />
    </div>
  );
}