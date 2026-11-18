import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Play,
  CheckCircle2,
  XCircle,
  PoundSterling,
  Clock,
  ChevronDown,
  Package,
  AlertTriangle,
  ShieldAlert,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Play },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
};

const PREP_STAGE_LABELS = {
  queued: { label: "Queued", color: "bg-slate-100 text-slate-700 border-slate-200" },
  prepping: { label: "Prepping", color: "bg-amber-50 text-amber-700 border-amber-200" },
  cooking: { label: "Cooking", color: "bg-orange-50 text-orange-700 border-orange-200" },
  ready: { label: "Ready in Custody", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  handed_off: { label: "Handed Off to Service", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
};

export default function ProductionOrderCard({
  order,
  recipesById,
  recipesByOutput,
  onStart,
  onComplete,
  onCancel,
  onReconcile,
  onUpdatePrepStage,
}) {
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const [showConsumption, setShowConsumption] = useState(false);
  const consumed = order.ingredients_consumed || [];
  const hasConsumption = consumed.length > 0;

  const isCatering = order.order_source === "catering" && !!order.catering_event_id;
  const hasDirectRecipe = !!(order.recipe_id && recipesById?.has(order.recipe_id));
  const outputRecipeMatches =
    order.output_item_id && recipesByOutput ? recipesByOutput.get(order.output_item_id) || [] : [];
  const hasResolvedRecipe = !recipesById || hasDirectRecipe || outputRecipeMatches.length === 1;

  const isCompletedWithoutConsumption =
    order.status === "completed" && consumed.length === 0 && isCatering;
  const isActiveMissingRecipe =
    (order.status === "pending" || order.status === "in_progress") && !hasResolvedRecipe;

  const custodyQty =
    order.custody_output_quantity != null ? Number(order.custody_output_quantity) : null;
  const prepMeta = PREP_STAGE_LABELS[order.prep_stage || "queued"] || PREP_STAGE_LABELS.queued;

  return (
    <Card
      className={`p-3 bg-white shadow-none transition-colors ${
        isCompletedWithoutConsumption
          ? "border-amber-300 bg-amber-50/20"
          : isActiveMissingRecipe
          ? "border-red-200"
          : "border-slate-200/80 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-medium text-slate-900 truncate">
              {order.recipe_name || "Unknown Recipe"}
            </h4>
            <Badge className={config.color + " gap-1"}>
              <StatusIcon className="w-3 h-3" /> {config.label}
            </Badge>

            {isCatering && order.status === "completed" && (
              <Badge variant="outline" className={prepMeta.color + " text-xs"}>
                {prepMeta.label}
              </Badge>
            )}

            {isCompletedWithoutConsumption && (
              <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100 gap-1 text-xs">
                <ShieldAlert className="w-3 h-3" /> Needs Custody Reconciliation (0 ingredients deducted)
              </Badge>
            )}

            {isActiveMissingRecipe && (
              <Badge className="bg-red-100 text-red-800 border border-red-300 hover:bg-red-100 gap-1 text-xs">
                <AlertTriangle className="w-3 h-3" />
                {outputRecipeMatches.length > 1
                  ? "Ambiguous Output Recipe"
                  : "Missing Active Recipe"}
              </Badge>
            )}

            {order.parent_recipe_name && (
              <Badge variant="outline" className="text-purple-700 border-purple-200">
                Sub-recipe for {order.parent_recipe_name}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span>
              Target: {order.target_quantity} batch(es)
              {order.required_output_quantity > 0 &&
                ` · Expected ${order.required_output_quantity} ${order.output_unit || ""}`}
            </span>
            {order.actual_output_quantity != null && (
              <span className="text-green-600 font-medium">
                Actual: {order.actual_output_quantity} {order.output_unit || ""}
              </span>
            )}
            {isCatering && order.status === "completed" && custodyQty != null && (
              <span className="text-indigo-700 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">
                Event Custody Output: {custodyQty} {order.output_unit || ""} (not shelf stock)
              </span>
            )}
            {order.total_cost > 0 ? (
              <span className="flex items-center gap-0.5 font-medium text-slate-700">
                <PoundSterling className="w-3 h-3" /> {formatCurrency(order.total_cost)}
              </span>
            ) : (
              order.status === "completed" && (
                <span className="text-amber-700 font-medium">Cost: EGP 0.00</span>
              )
            )}
            {order.completed_by && <span>by {order.completed_by}</span>}
            {order.handoff_to && (
              <span className="text-indigo-700">· Handed off to {order.handoff_to}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
          {order.status === "pending" && onStart && (
            <Button size="sm" variant="outline" onClick={onStart} className="gap-1 text-blue-600">
              <Play className="w-3 h-3" /> Start
            </Button>
          )}

          {order.status === "in_progress" && (
            <>
              {onComplete && (
                <Button
                  size="sm"
                  onClick={onComplete}
                  className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-3 h-3" /> Complete
                </Button>
              )}
              {onCancel && (
                <Button size="sm" variant="outline" onClick={onCancel} className="text-red-600">
                  <XCircle className="w-3 h-3" />
                </Button>
              )}
            </>
          )}

          {isCompletedWithoutConsumption && onReconcile && (
            <Button
              size="sm"
              onClick={onReconcile}
              className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Wrench className="w-3 h-3" /> Reconcile Custody
            </Button>
          )}

          {isCatering &&
            order.status === "completed" &&
            !isCompletedWithoutConsumption &&
            onUpdatePrepStage &&
            order.prep_stage !== "handed_off" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdatePrepStage("handed_off")}
                className="gap-1 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                <UtensilsCrossed className="w-3 h-3" /> Mark Handed Off
              </Button>
            )}

          {hasConsumption && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowConsumption((s) => !s)}
              className="gap-1 text-slate-600"
            >
              <Package className="w-3 h-3" /> {consumed.length} item(s)
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showConsumption ? "rotate-180" : ""}`}
              />
            </Button>
          )}
        </div>
      </div>

      {order.waste_note && <p className="text-xs text-amber-600 mt-2">⚠ {order.waste_note}</p>}

      {hasConsumption && showConsumption && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
            <Package className="w-3.5 h-3.5" /> Raw Materials Consumed
            {isCatering && (
              <span className="font-normal text-slate-500">
                (deducted from event kitchen custody)
              </span>
            )}
          </p>
          <div className="space-y-1.5">
            {consumed.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-slate-50 rounded-md px-2.5 py-1.5"
              >
                <span className="text-slate-700 font-medium truncate">
                  {item.inventory_item_name || "Unknown item"}
                  {(order.sub_recipe_consumption || []).some(
                    (s) => s.inventory_item_id === item.inventory_item_id
                  ) && (
                    <span className="ml-1 text-[10px] text-purple-700">
                      (prepared sub-recipe stock)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-slate-500">
                    {item.quantity_consumed} {item.unit || ""}
                  </span>
                  {item.cost > 0 && (
                    <span className="text-slate-700 flex items-center gap-0.5 font-medium">
                      <PoundSterling className="w-3 h-3" /> {formatCurrency(item.cost)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="font-semibold text-slate-600">Total Consumption</span>
            <span className="font-bold text-slate-900 flex items-center gap-0.5">
              <PoundSterling className="w-3.5 h-3.5" /> {formatCurrency(order.total_cost)}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}