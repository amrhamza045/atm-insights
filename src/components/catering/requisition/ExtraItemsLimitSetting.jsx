import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCateringSettings } from "@/components/catering/useCateringSettings";
import { errorText } from "./requisitionApi";

/** Extra items limit (% of planned food cost) & Additional Requisition Money Allowance (EGP per event). Saved through the server only. */
export default function ExtraItemsLimitSetting({ canEdit }) {
  const { settings, setExtraItemsLimit } = useCateringSettings();
  const saved = settings?.extra_items_limit_percent;
  const savedAllowance = settings?.additional_requisition_allowance_amount;
  const [draft, setDraft] = useState(null);
  const [allowanceDraft, setAllowanceDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const value = draft ?? (saved == null ? "" : String(saved));
  const allowanceValue = allowanceDraft ?? (savedAllowance == null ? "" : String(savedAllowance));

  const save = async () => {
    setBusy(true);
    try {
      await setExtraItemsLimit(
        value === "" ? null : Number(value),
        allowanceValue === "" ? null : Number(allowanceValue)
      );
      toast.success("Requisition limits saved");
      setDraft(null);
      setAllowanceDraft(null);
    } catch (e) {
      toast.error(errorText(e, "Could not save the limits"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="additional-allowance">Additional requisition allowance per event (EGP)</Label>
          <Input
            id="additional-allowance"
            type="number"
            min="0"
            step="any"
            placeholder="e.g. 3000"
            value={allowanceValue}
            disabled={!canEdit || busy}
            onChange={(e) => setAllowanceDraft(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            First requisition is free for editing. Second and subsequent requisitions for an event share this money cap (deducted at agreed qty × item cost upon mutual confirmation). Once exhausted, further requisitions require Approval Center approval.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="extra-limit">Extra items limit (% of planned food cost)</Label>
          <Input
            id="extra-limit"
            type="number"
            min="0"
            step="any"
            value={value}
            disabled={!canEdit || busy}
            onChange={(e) => setDraft(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional percentage reference for extra items against the event's planned food cost.
          </p>
        </div>
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <Button disabled={busy || (draft === null && allowanceDraft === null)} onClick={save}>
            Save Requisition Limits
          </Button>
        </div>
      )}
    </Card>
  );
}