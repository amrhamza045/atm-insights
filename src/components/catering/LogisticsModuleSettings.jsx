import React from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import { useCateringSettings } from "./useCateringSettings";

export default function LogisticsModuleSettings({ canEdit }) {
  const { logisticsEnabled, setLogisticsEnabled } = useCateringSettings();

  const toggle = async (value) => {
    await setLogisticsEnabled(value);
    toast.success(value ? "Logistics module turned on" : "Logistics module turned off");
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">In-house logistics module</h3>
            <p className="text-sm text-slate-500">
              When off, the Logistics tab, transport costs view and equipment chain of custody are hidden — use this when a
              supplier handles all transport. Existing trip records are kept and reappear when you switch it back on.
            </p>
          </div>
        </div>
        <Switch checked={logisticsEnabled} onCheckedChange={toggle} disabled={!canEdit} />
      </div>
    </Card>
  );
}