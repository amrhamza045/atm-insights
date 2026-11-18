import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CateringMarginSettings({ canEdit }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const { data: settings } = useQuery({
    queryKey: ["system-settings-default"],
    queryFn: async () => (await base44.entities.SystemSettings.filter({ setting_key: "default" }))[0] || null,
  });
  useEffect(() => setValue(settings?.catering_target_margin_percentage ?? ""), [settings]);
  const save = async () => {
    const margin = value === "" ? null : Number(value);
    if (margin !== null && (margin < 0 || margin > 100)) return toast.error("Enter a margin from 0 to 100%");
    const payload = { catering_target_margin_percentage: margin };
    if (settings?.id) await base44.entities.SystemSettings.update(settings.id, payload);
    else await base44.entities.SystemSettings.create({ setting_key: "default", ...payload });
    await queryClient.invalidateQueries({ queryKey: ["system-settings-default"] });
    toast.success("Catering margin benchmark saved");
  };
  return <div className="space-y-3">
    <p className="text-sm text-slate-600">Used when neither the package nor event type has a target.</p>
    <div className="flex items-end gap-2 max-w-sm">
      <div className="flex-1"><Label>Default target margin (%)</Label><Input type="number" min="0" max="100" step="0.1" value={value} disabled={!canEdit} onChange={(e) => setValue(e.target.value)} /></div>
      {canEdit && <Button onClick={save}>Save</Button>}
    </div>
  </div>;
}