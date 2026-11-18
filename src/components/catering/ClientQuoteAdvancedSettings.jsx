import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { usePortalQuoteSettings } from "./usePortalQuoteSettings";

const SWITCHES = [
  { key: "portal_show_per_guest_price", label: "Show price per guest", hint: "Total divided by the expected guest count." },
  { key: "portal_hide_discount", label: "Hide the discount line", hint: "The customer only sees the net price." },
  { key: "portal_starting_from_mode", label: "'Starting from' mode", hint: "One indicative price only — no lines, no breakdown." },
  { key: "portal_package_only_mode", label: "Package only", hint: "Package name and total, without individual lines." },
  { key: "portal_show_balance_due", label: "Show outstanding balance", hint: "Off = only total and paid amounts are shown." },
  { key: "portal_hide_internal_notes", label: "Keep quote notes internal", hint: "Off = quote notes are visible to the customer." },
];

const ALLOCATION = [
  { value: "into_lines", label: "Spread across the quote lines" },
  { value: "into_subtotal", label: "Fold into the shown subtotal" },
  { value: "total_only", label: "Show in the final total only" },
];

/** Pricing presentation controls: where hidden charges land, labels, rounding. */
export default function ClientQuoteAdvancedSettings({ canEdit, eventId }) {
  const { vis, setVis: setPortalVisibility } = usePortalQuoteSettings(eventId);
  const [labels, setLabels] = useState({});

  useEffect(() => {
    setLabels({
      portal_label_subtotal: vis.portal_label_subtotal || "",
      portal_label_service_charge: vis.portal_label_service_charge || "",
      portal_label_tax: vis.portal_label_tax || "",
      portal_label_total: vis.portal_label_total || "",
      portal_round_total_to: vis.portal_round_total_to || 0,
    });
  }, [vis.portal_label_subtotal, vis.portal_label_service_charge, vis.portal_label_tax, vis.portal_label_total, vis.portal_round_total_to]);

  const save = async (patch) => {
    await setPortalVisibility(patch);
    toast.success("Client-side quote updated");
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-800">Where do hidden charges go?</p>
        <p className="text-xs text-slate-500 mb-2">
          When the service charge, tax or service costs are hidden, the customer still pays them — choose how they appear.
        </p>
        <Select
          value={vis.hidden_charge_allocation || "into_subtotal"}
          onValueChange={(v) => save({ hidden_charge_allocation: v })}
          disabled={!canEdit}
        >
          <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ALLOCATION.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="divide-y border-t">
        {SWITCHES.map((s) => (
          <div key={s.key} className="py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{s.label}</p>
              <p className="text-xs text-slate-500">{s.hint}</p>
            </div>
            <Switch checked={!!vis[s.key]} onCheckedChange={(v) => save({ [s.key]: v })} disabled={!canEdit} />
          </div>
        ))}
      </div>

      <div className="border-t pt-3 space-y-3">
        <p className="text-sm font-medium text-slate-800">Line labels & rounding</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Subtotal label" value={labels.portal_label_subtotal || ""} disabled={!canEdit}
            onChange={(e) => setLabels({ ...labels, portal_label_subtotal: e.target.value })} />
          <Input placeholder="Service charge label" value={labels.portal_label_service_charge || ""} disabled={!canEdit}
            onChange={(e) => setLabels({ ...labels, portal_label_service_charge: e.target.value })} />
          <Input placeholder="Tax label" value={labels.portal_label_tax || ""} disabled={!canEdit}
            onChange={(e) => setLabels({ ...labels, portal_label_tax: e.target.value })} />
          <Input placeholder="Total label" value={labels.portal_label_total || ""} disabled={!canEdit}
            onChange={(e) => setLabels({ ...labels, portal_label_total: e.target.value })} />
          <Input type="number" placeholder="Round total to nearest (0 = off)" value={labels.portal_round_total_to ?? 0} disabled={!canEdit}
            onChange={(e) => setLabels({ ...labels, portal_round_total_to: Number(e.target.value) })} />
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => save({ ...labels, portal_round_total_to: Number(labels.portal_round_total_to) || 0 })}>
            Save labels & rounding
          </Button>
        )}
      </div>
    </div>
  );
}