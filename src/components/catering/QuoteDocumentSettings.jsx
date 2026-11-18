import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useCateringSettings } from "./useCateringSettings";
import CollapsibleSection from "./CollapsibleSection";
import ClientQuoteVisibilitySettings from "./ClientQuoteVisibilitySettings";
import ClientQuoteAdvancedSettings from "./ClientQuoteAdvancedSettings";
import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";

export default function QuoteDocumentSettings() {
  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  const canEdit = isAdmin || permissions?.catering_settings_edit === true;
  const { isLoading, hideQuoteRecipeLines, setPortalVisibility } = useCateringSettings();
  const [saving, setSaving] = useState(false);

  const toggle = async (hide) => {
    setSaving(true);
    try {
      await setPortalVisibility({ quote_hide_recipe_lines: hide });
      toast.success(hide ? "Recipe items will be hidden on quotes" : "Recipe items will be shown on quotes");
    } catch (e) {
      toast.error(e.message || "Could not save setting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
    <Card>
      <CardHeader><CardTitle className="text-base">Quote document</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-slate-900">Hide individual recipe items</p>
            <p className="text-sm text-slate-500">
              On printed and downloaded quotations (English and Arabic), each package shows only its name, guest count and total.
              Invoices and receipts are not affected.
            </p>
          </div>
          <Switch
            checked={hideQuoteRecipeLines}
            onCheckedChange={toggle}
            disabled={isLoading || saving || !canEdit}
          />
        </div>
        {!canEdit && <p className="text-xs text-slate-500 mt-3">Changing this setting requires the Edit Catering Settings permission.</p>}
      </CardContent>
    </Card>
    <CollapsibleSection title="Client-side quote (what the customer sees in the Portal)">
      <ClientQuoteVisibilitySettings canEdit={canEdit} />
    </CollapsibleSection>
    <CollapsibleSection title="Client-side pricing presentation">
      <ClientQuoteAdvancedSettings canEdit={canEdit} />
    </CollapsibleSection>
    </div>
  );
}