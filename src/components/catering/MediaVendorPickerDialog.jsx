import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const BASIS_LABELS = { per_event: "per event", per_hour: "per hour", per_day: "per day" };
const SERVICE_LABELS = { photographer: "Photography", videographer: "Videography", both: "Photo & Video" };

/** Pick a photography / videography vendor and drop it onto the quote as a priced line. */
export default function MediaVendorPickerDialog({ open, onOpenChange, onPick }) {
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["catering-media-vendors-picker"],
    queryFn: () => base44.entities.CateringMediaVendor.list("-created_date", 200),
    enabled: open,
  });

  const active = vendors.filter((v) => v.is_active !== false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-slate-400" /> Add photography &amp; videography
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading vendors…</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-slate-500">
            No media vendors yet — add them on the Packages &amp; Media tab first.
          </p>
        ) : (
          <div className="space-y-2">
            {active.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{v.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">{SERVICE_LABELS[v.service_type] || v.service_type}</Badge>
                    <Badge variant="outline" className="text-xs">{v.tier?.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {formatCurrency(v.price, true)} {BASIS_LABELS[v.price_basis] || ""}
                    </Badge>
                    {Number(v.coverage_hours) > 0 && (
                      <Badge variant="outline" className="text-xs">{v.coverage_hours}h coverage</Badge>
                    )}
                  </div>
                  {v.deliverables && <p className="text-xs text-slate-500 mt-1">{v.deliverables}</p>}
                </div>
                <Button size="sm" className="shrink-0" onClick={() => { onPick(v); onOpenChange(false); }}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}