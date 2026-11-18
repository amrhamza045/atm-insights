import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PackageCheck,
  ChefHat,
  UtensilsCrossed,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ShieldAlert,
  ArrowRight,
  PoundSterling,
} from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function computeEventCycleMetrics(orders = [], reservations = [], recipesById = new Map(), recipesByOutput = new Map()) {
  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const totalBatches = activeOrders.length;
  const completedBatches = activeOrders.filter((o) => o.status === "completed");
  const inProgressBatches = activeOrders.filter((o) => o.status === "in_progress");
  const pendingBatches = activeOrders.filter((o) => o.status === "pending");

  // Check recipe resolution & reconciliation status per batch (strictly recipe_id or unambiguous active output_item_id)
  const unreconciledCompleted = [];
  const missingRecipeActive = [];

  for (const order of activeOrders) {
    const hasDirect = order.recipe_id && recipesById.has(order.recipe_id);
    const outMatches = order.output_item_id ? recipesByOutput.get(order.output_item_id) || [] : [];
    const hasUnambiguousOutput = outMatches.length === 1;
    const hasValidRecipe = hasDirect || hasUnambiguousOutput;

    if (order.status === "completed") {
      const consumedCount = (order.ingredients_consumed || []).length;
      if (consumedCount === 0) {
        unreconciledCompleted.push(order);
      }
    } else if (!hasValidRecipe) {
      missingRecipeActive.push({
        order,
        reason: outMatches.length > 1 ? "ambiguous_output_recipe" : "missing_recipe",
      });
    }
  }

  // Raw production inputs in event custody (from CateringReservation with purpose === 'production_input')
  const prodInputs = (reservations || []).filter(
    (r) => r.purpose === "production_input" && r.status !== "released"
  );
  const releasedInputs = prodInputs.filter((r) => r.status === "consumed");
  const unreleasedInputs = prodInputs.filter((r) => r.status === "reserved");

  const totalReleasedInputRows = releasedInputs.length;
  const consumedInputRows = releasedInputs.filter(
    (r) => (Number(r.custody_consumed_quantity) || 0) > 0 || Number(r.custody_quantity) === 0
  ).length;
  const unconsumedInputRows = releasedInputs.filter(
    (r) => (Number(r.custody_quantity) || 0) > 0 && (Number(r.custody_consumed_quantity) || 0) === 0
  ).length;

  // Output held in event custody vs handed off
  const handedOffBatches = completedBatches.filter((o) => o.prep_stage === "handed_off");
  const readyInCustodyBatches = completedBatches.filter((o) => o.prep_stage !== "handed_off");

  const totalCost = round2(completedBatches.reduce((s, o) => s + (Number(o.total_cost) || 0), 0));

  // Cycle stage determination
  let cycleStatus = "not_started";
  let cycleLabel = "Awaiting Production";
  if (unreconciledCompleted.length > 0 || missingRecipeActive.length > 0) {
    cycleStatus = "attention_needed";
    cycleLabel =
      unreconciledCompleted.length > 0
        ? "Reconciliation Required"
        : "Missing Recipe Mapping";
  } else if (totalBatches > 0 && handedOffBatches.length === totalBatches) {
    cycleStatus = "cycle_complete";
    cycleLabel = "Kitchen Cycle Complete";
  } else if (totalBatches > 0 && completedBatches.length === totalBatches) {
    cycleStatus = "produced_in_custody";
    cycleLabel = "Produced · In Event Custody";
  } else if (completedBatches.length > 0 || inProgressBatches.length > 0) {
    cycleStatus = "in_production";
    cycleLabel = "Production In Progress";
  } else if (releasedInputs.length > 0) {
    cycleStatus = "inputs_in_custody";
    cycleLabel = "Inputs in Kitchen Custody";
  }

  const progressPct =
    totalBatches > 0
      ? Math.round(
          ((completedBatches.length * 0.7 + handedOffBatches.length * 0.3) / totalBatches) * 100
        )
      : 0;

  return {
    totalBatches,
    completedCount: completedBatches.length,
    inProgressCount: inProgressBatches.length,
    pendingCount: pendingBatches.length,
    handedOffCount: handedOffBatches.length,
    readyInCustodyCount: readyInCustodyBatches.length,
    prodInputs,
    releasedInputs,
    unreleasedInputs,
    totalReleasedInputRows,
    consumedInputRows,
    unconsumedInputRows,
    unreconciledCompleted,
    missingRecipeActive,
    totalCost,
    cycleStatus,
    cycleLabel,
    progressPct,
  };
}

const CYCLE_BADGE_STYLES = {
  not_started: "bg-slate-100 text-slate-700 border-slate-200",
  inputs_in_custody: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_production: "bg-blue-50 text-blue-700 border-blue-200",
  produced_in_custody: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cycle_complete: "bg-green-100 text-green-800 border-green-300",
  attention_needed: "bg-amber-50 text-amber-800 border-amber-300",
};

export default function EventKitchenCycleBar({
  orders = [],
  reservations = [],
  recipesById,
  recipesByOutput,
  onOpenReconcile,
}) {
  const [showCustodyDetail, setShowCustodyDetail] = useState(false);
  const metrics = computeEventCycleMetrics(orders, reservations, recipesById, recipesByOutput);

  return (
    <div className="bg-white border border-slate-200/90 rounded-lg p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Event Production & Kitchen Cycle
          </span>
          <Badge variant="outline" className={`text-xs font-medium ${CYCLE_BADGE_STYLES[metrics.cycleStatus]}`}>
            {metrics.cycleStatus === "attention_needed" && <AlertTriangle className="w-3 h-3 mr-1" />}
            {metrics.cycleStatus === "cycle_complete" && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {metrics.cycleLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {metrics.totalCost > 0 && (
            <span className="text-xs font-medium text-slate-700 flex items-center gap-0.5 bg-slate-100 px-2 py-0.5 rounded">
              <PoundSterling className="w-3 h-3" />
              Production Cost: {formatCurrency(metrics.totalCost)}
            </span>
          )}
          {metrics.prodInputs.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowCustodyDetail((v) => !v)}
              className="h-7 px-2 text-xs text-slate-600 gap-1"
            >
              Custody Ledger ({metrics.prodInputs.length} input{metrics.prodInputs.length === 1 ? "" : "s"})
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustodyDetail ? "rotate-180" : ""}`} />
            </Button>
          )}
        </div>
      </div>

      {/* 3-Stage Kitchen Cycle Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* Stage 1: Raw Material Custody */}
        <div className="flex items-start gap-2 rounded-md border border-slate-200/80 bg-slate-50/70 p-2.5">
          <PackageCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-800 flex items-center justify-between gap-1">
              <span>1. Event Input Custody</span>
              <span className="text-[11px] font-mono text-slate-600">
                {metrics.consumedInputRows}/{metrics.totalReleasedInputRows} consumed
              </span>
            </div>
            <p className="text-slate-500 mt-0.5">
              {metrics.unreleasedInputs.length > 0
                ? `${metrics.unreleasedInputs.length} input(s) still awaiting requisition release`
                : metrics.unconsumedInputRows > 0
                ? `${metrics.unconsumedInputRows} released input(s) held in kitchen custody`
                : metrics.totalReleasedInputRows > 0
                ? "All released production inputs consumed"
                : "No raw production inputs reserved"}
            </p>
          </div>
        </div>

        {/* Stage 2: Batch Production */}
        <div className="flex items-start gap-2 rounded-md border border-slate-200/80 bg-slate-50/70 p-2.5">
          <ChefHat className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-800 flex items-center justify-between gap-1">
              <span>2. Batch Production</span>
              <span className="text-[11px] font-mono text-slate-600">
                {metrics.completedCount}/{metrics.totalBatches} done
              </span>
            </div>
            <p className="text-slate-500 mt-0.5">
              {metrics.unreconciledCompleted.length > 0
                ? `${metrics.unreconciledCompleted.length} completed batch(es) did not deduct custody inputs`
                : metrics.inProgressCount > 0
                ? `${metrics.inProgressCount} in progress · ${metrics.pendingCount} pending`
                : metrics.pendingCount > 0
                ? `${metrics.pendingCount} batch(es) queued for production`
                : "All planned batches produced into event custody"}
            </p>
          </div>
        </div>

        {/* Stage 3: Finished Output Custody & Kitchen Handoff */}
        <div className="flex items-start gap-2 rounded-md border border-slate-200/80 bg-slate-50/70 p-2.5">
          <UtensilsCrossed className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-800 flex items-center justify-between gap-1">
              <span>3. Output Custody & Handoff</span>
              <span className="text-[11px] font-mono text-slate-600">
                {metrics.handedOffCount}/{metrics.totalBatches} handed off
              </span>
            </div>
            <p className="text-slate-500 mt-0.5">
              {metrics.readyInCustodyCount > 0
                ? `${metrics.readyInCustodyCount} finished batch(es) held in event kitchen custody`
                : metrics.handedOffCount > 0 && metrics.handedOffCount === metrics.totalBatches
                ? "All finished batches handed off to event service"
                : "Finished goods stay in event custody (never shelf stock)"}
            </p>
          </div>
        </div>
      </div>

      {/* Warning banner if any completed batch skipped ingredient consumption due to missing recipe */}
      {metrics.unreconciledCompleted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50/90 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">
                {metrics.unreconciledCompleted.length === 1
                  ? `Batch "${metrics.unreconciledCompleted[0].recipe_name}" was completed without consuming event custody ingredients.`
                  : `${metrics.unreconciledCompleted.length} completed batches have zero recorded ingredient consumption.`}
              </span>{" "}
              <span>
                Its referenced recipe ID was missing when completed, leaving raw materials untouched in event kitchen custody and cost at 0.00. Review the reconciliation preview to repair custody & cost without double-counting output.
              </span>
            </div>
          </div>
          {onOpenReconcile && (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenReconcile(metrics.unreconciledCompleted[0])}
              className="bg-amber-700 hover:bg-amber-800 text-white h-7 text-xs gap-1 shrink-0"
            >
              Review & Reconcile Custody
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Expandable Custody Ledger */}
      {showCustodyDetail && metrics.prodInputs.length > 0 && (
        <div className="border-t border-slate-200 pt-2.5 space-y-2">
          <div className="text-xs font-semibold text-slate-700">
            Event Kitchen Custody — Raw Production Inputs
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {metrics.prodInputs.map((r) => {
              const releasedQty = Number(r.actual_quantity ?? r.quantity_reserved) || 0;
              const remainingCustody =
                r.status === "consumed"
                  ? r.custody_quantity != null
                    ? Number(r.custody_quantity)
                    : Math.max(0, releasedQty - (Number(r.custody_consumed_quantity) || 0))
                  : 0;
              const consumedByProd = Number(r.custody_consumed_quantity) || 0;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 text-xs rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate">{r.inventory_item_name}</div>
                    {r.produced_item_name && (
                      <div className="text-[11px] text-slate-500 truncate">For: {r.produced_item_name}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {r.status === "reserved" ? (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        Reserved: {r.quantity_reserved} {r.unit || ""}
                      </Badge>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-medium text-slate-700">
                          In Custody: <span className="font-semibold text-indigo-700">{round2(remainingCustody)} {r.unit || ""}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Used: {round2(consumedByProd)} / {round2(releasedQty)} {r.unit || ""}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}