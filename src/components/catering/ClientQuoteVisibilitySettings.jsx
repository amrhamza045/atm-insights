import React from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { usePortalQuoteSettings } from "./usePortalQuoteSettings";

const TOGGLES = [
  { key: "portal_show_line_items", label: "Itemised quote lines", hint: "Off = the customer sees only the totals, no breakdown of what is included." },
  { key: "portal_show_quantities", label: "Quantities per line", hint: "Show how many of each item the quote covers." },
  { key: "portal_show_line_prices", label: "Price per line", hint: "Off = line names are listed without individual prices." },
  { key: "portal_show_charge_breakdown", label: "Subtotal, service, tax & discount", hint: "Off = only the final total is shown." },
  { key: "portal_show_service_costs", label: "Staffing, logistics & equipment costs", hint: "The service costs card shown under the quote." },
  { key: "portal_show_payment_history", label: "Payment history", hint: "The list of recorded payments. Documents stay available either way." },
];

/** Controls exactly what a customer sees of their quote in the portal. */
export default function ClientQuoteVisibilitySettings({ canEdit, eventId }) {
  const { vis: portalVisibility, setVis } = usePortalQuoteSettings(eventId);

  const toggle = async (key, value) => {
    await setVis({ [key]: value });
    toast.success("Client-side quote updated");
  };

  return (
    <div className="space-y-1">
      <p className="text-sm text-slate-500 mb-3">
        Choose what customers can see of their quote in the Portal. Hiding a section never changes the quote itself or the totals you charge.
      </p>
      <div className="divide-y">
        {TOGGLES.map((t) => (
          <div key={t.key} className="py-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{t.label}</p>
              <p className="text-xs text-slate-500">{t.hint}</p>
            </div>
            <Switch
              checked={portalVisibility[t.key]}
              onCheckedChange={(v) => toggle(t.key, v)}
              disabled={!canEdit}
            />
          </div>
        ))}
      </div>
    </div>
  );
}