import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  PackageCheck,
  Wrench,
  PoundSterling,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function BatchReconciliationDialog({ order, onClose, onReconciled }) {
  const [confirmed, setConfirmed] = useState(false);
  const [applying, setApplying] = useState(false);

  const {
    data: preview,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["batchReconcilePreview", order?.id],
    enabled: !!order?.id,
    queryFn: async () => {
      const res = await base44.functions.invoke("completeProductionOrder", {
        action: "reconcile_preview",
        production_order_id: order.id,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.preview;
    },
  });

  const handleApply = async () => {
    if (!preview?.canApply) return;
    if (!confirmed) {
      toast.error("Please confirm the reconciliation review checkbox first");
      return;
    }
    setApplying(true);
    try {
      const res = await base44.functions.invoke("completeProductionOrder", {
        action: "reconcile_apply",
        production_order_id: order.id,
        expected_fingerprint: preview.fingerprint,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(
        `Reconciled ${res.data?.reconciled_lines?.length || 0} custody input(s) · Cost: ${formatCurrency(
          res.data?.total_cost || 0
        )}`
      );
      onReconciled();
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      toast.error(`Reconciliation failed: ${msg}`);
      refetch();
    } finally {
      setApplying(false);
    }
  };

  const summary = preview?.order_summary;
  const lines = preview?.lines || [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-600" />
            Event Kitchen Custody & Batch Reconciliation
          </DialogTitle>
          <DialogDescription>
            Preview-first one-time repair for a completed catering batch whose recipe was missing at completion time.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            Inspecting source reservations, event kitchen custody, and output records…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Failed to load reconciliation preview
            </div>
            <p>{error.message}</p>
          </div>
        ) : preview ? (
          <div className="space-y-4 text-xs sm:text-sm">
            {/* Batch & Event Summary */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {summary?.recipe_name || order.recipe_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    Event: <strong>{summary?.catering_event_name || "Catering Event"}</strong> · Target:{" "}
                    {summary?.target_quantity} batch(es)
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    preview.canApply
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-red-50 text-red-800 border-red-300"
                  }
                >
                  {preview.canApply ? "Safe to Reconcile" : "Flagged for Manual Review"}
                </Badge>
              </div>

              {preview.source_label && (
                <div className="text-xs text-slate-600 bg-white rounded border border-slate-200 px-2.5 py-1.5">
                  <span className="font-semibold text-slate-700">Authoritative Source: </span>
                  {preview.source_label}
                </div>
              )}
            </div>

            {/* Warnings */}
            {(preview.warnings || []).map((w, i) => (
              <div
                key={i}
                className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}

            {/* Blockers (Manual Review Required) */}
            {(preview.blockers || []).length > 0 && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-red-800">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  Automatic Reconciliation Blocked — Manual Review Required
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  {preview.blockers.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Output & Shelf Inventory Protection Guarantee */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded-md border border-indigo-200 bg-indigo-50/60 p-2.5">
                  <div className="text-indigo-700 font-semibold flex items-center gap-1">
                    <PackageCheck className="w-3.5 h-3.5" /> Event Custody Output
                  </div>
                  <div className="mt-1 font-bold text-slate-900 text-sm">
                    {summary.custody_output_after} {summary.output_unit}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Already recorded ({summary.custody_output_before ?? 0} {summary.output_unit}) ·{" "}
                    <strong>+{summary.output_custody_delta} {summary.output_unit}</strong> (no double-count)
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-slate-700 font-semibold">General Shelf Inventory</div>
                  <div className="mt-1 font-bold text-slate-900 text-sm">
                    {summary.shelf_inventory_quantity != null
                      ? `${summary.shelf_inventory_quantity} ${summary.output_unit}`
                      : "Untouched"}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Delta: <strong>0 {summary.output_unit}</strong> (catering output stays in event custody)
                  </div>
                </div>

                <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-2.5">
                  <div className="text-emerald-800 font-semibold flex items-center gap-1">
                    <PoundSterling className="w-3.5 h-3.5" /> Batch Production Cost
                  </div>
                  <div className="mt-1 font-bold text-slate-900 text-sm">
                    {formatCurrency(summary.total_cost_before)} → {formatCurrency(summary.total_cost_after)}
                  </div>
                  {summary.output_unit_cost_after != null && (
                    <div className="text-[11px] text-slate-600">
                      Output unit cost: {formatCurrency(summary.output_unit_cost_after)} / {summary.output_unit}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ingredient Custody Reconciliation Table */}
            {lines.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Source Event Custody Reservations to Consume ({lines.length})</span>
                  <span>Total: {formatCurrency(summary?.total_cost_after || 0)}</span>
                </div>
                <div className="divide-y divide-slate-200">
                  {lines.map((line) => (
                    <div
                      key={line.reservation_id}
                      className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900">{line.inventory_item_name}</div>
                        <div className="text-[11px] text-slate-500">
                          Reserved & Released: {line.actual_quantity} {line.unit} · Previously Consumed:{" "}
                          {line.consumed_before} {line.unit}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <div className="text-[11px] text-slate-500">Custody Before → After</div>
                          <div className="font-mono font-semibold text-indigo-700">
                            {line.custody_before} → {line.custody_after} {line.unit}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-slate-500">Consume Now</div>
                          <div className="font-mono font-semibold text-emerald-700">
                            -{line.to_consume} {line.unit}
                          </div>
                        </div>
                        <div className="min-w-[80px]">
                          <div className="text-[11px] text-slate-500">Cost</div>
                          <div className="font-semibold text-slate-900">{formatCurrency(line.line_cost)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation Checkbox */}
            {preview.canApply && (
              <label className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  I have reviewed the source reservation records and confirm applying this one-time repair: deduct{" "}
                  <strong>{lines.length} ingredient(s)</strong> from event kitchen custody, record{" "}
                  <strong>{formatCurrency(summary?.total_cost_after || 0)}</strong> in production cost, and keep{" "}
                  <strong>
                    {summary?.custody_output_after} {summary?.output_unit}
                  </strong>{" "}
                  in event custody without adding to general shelf stock.
                </span>
              </label>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {preview?.canApply && (
            <Button
              onClick={handleApply}
              disabled={!confirmed || applying}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Apply One-Time Custody Repair
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}