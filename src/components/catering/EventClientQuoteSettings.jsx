import React from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { useIsAdmin } from "@/components/permissions/PermissionsContext";
import { usePortalQuoteSettings } from "./usePortalQuoteSettings";
import ClientQuoteVisibilitySettings from "./ClientQuoteVisibilitySettings";
import ClientQuoteAdvancedSettings from "./ClientQuoteAdvancedSettings";
import CollapsibleSection from "./CollapsibleSection";

/** Per-event override of what the customer sees of this event's quote in the Portal. */
export default function EventClientQuoteSettings({ event }) {
  const canEdit = useIsAdmin();
  const { isOverride, setOverrideEnabled } = usePortalQuoteSettings(event?.id);

  if (!event) return null;

  const toggle = async (value) => {
    await setOverrideEnabled(value, event.event_name);
    toast.success(value ? "This event now uses its own settings" : "Back to the global settings");
  };

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Eye className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">Custom client-side quote for this event</h3>
              <p className="text-sm text-slate-500">
                Off = this event follows the global settings in Lists &amp; Settings. On = the settings below apply to{" "}
                <span className="font-medium text-slate-700">{event.event_name}</span> only.
              </p>
            </div>
          </div>
          <Switch checked={isOverride} onCheckedChange={toggle} disabled={!canEdit} />
        </div>
      </Card>

      {isOverride && (
        <>
          <CollapsibleSection title="Client-side quote (what the customer sees in the Portal)">
            <ClientQuoteVisibilitySettings canEdit={canEdit} eventId={event.id} />
          </CollapsibleSection>
          <CollapsibleSection title="Client-side pricing presentation">
            <ClientQuoteAdvancedSettings canEdit={canEdit} eventId={event.id} />
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}