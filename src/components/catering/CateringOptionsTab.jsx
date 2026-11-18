import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import LogisticsModuleSettings from "./LogisticsModuleSettings";
import CollapsibleSection from "./CollapsibleSection";
import CateringMarginSettings from "./CateringMarginSettings";
import ExtraItemsLimitSetting from "./requisition/ExtraItemsLimitSetting";

const LISTS = [
  { key: "event_type", label: "Event Types" },
  { key: "service_style", label: "Service Styles" },
  { key: "dress_code", label: "Dress Codes" },
];

function OptionList({ listType, label, canEdit }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: options = [] } = useQuery({
    queryKey: ["catering-options", listType],
    queryFn: () => base44.entities.CateringOption.filter({ list_type: listType }, "sort_order", 200),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["catering-options", listType] });

  const add = async () => {
    if (!newName.trim()) return;
    await base44.entities.CateringOption.create({
      list_type: listType,
      name: newName.trim(),
      is_active: true,
      sort_order: options.length + 1,
    });
    setNewName("");
    await refresh();
    toast.success(`${label} updated`);
  };

  const toggle = async (opt) => {
    await base44.entities.CateringOption.update(opt.id, { is_active: !(opt.is_active !== false) });
    await refresh();
  };

  const remove = async (opt) => {
    await base44.entities.CateringOption.delete(opt.id);
    await refresh();
  };

  return (
    <CollapsibleSection title={label}>
      <div className="divide-y">
        {options.length === 0 ? (
          <p className="text-sm text-slate-500 pb-2">No options yet.</p>
        ) : (
          options.map((o) => (
            <div key={o.id} className="py-2 flex items-center justify-between gap-2">
              <span className={`text-sm ${o.is_active === false ? "text-slate-400 line-through" : "text-slate-700"}`}>{o.name}</span>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Switch checked={o.is_active !== false} onCheckedChange={() => toggle(o)} />
                  <Button variant="ghost" size="icon" onClick={() => remove(o)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {canEdit && (
        <div className="flex items-center gap-2 mt-3">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`Add ${label.toLowerCase().replace(/s$/, "")}`} />
          <Button size="sm" className="gap-1.5" onClick={add}><Plus className="w-4 h-4" /> Add</Button>
        </div>
      )}
    </CollapsibleSection>
  );
}

export default function CateringOptionsTab() {
  const { permissions, assigned } = usePermissions();
  const canEdit = permissions?.catering_settings_edit === true;

  return (
    <div className="space-y-3">
      {!canEdit && <p className="text-sm text-slate-500">These lists are read-only — changing them needs the Edit Catering Settings permission.</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {LISTS.map((l) => <OptionList key={l.key} listType={l.key} label={l.label} canEdit={canEdit} />)}
      </div>
      <LogisticsModuleSettings canEdit={canEdit} />
      <ExtraItemsLimitSetting canEdit={assigned?.catering_settings_edit === true} />
      <CollapsibleSection title="Target margin">
        {/* Saved to system settings, whose data rules also require settings_edit. */}
        <CateringMarginSettings canEdit={canEdit && permissions?.settings_edit === true} />
      </CollapsibleSection>
    </div>
  );
}