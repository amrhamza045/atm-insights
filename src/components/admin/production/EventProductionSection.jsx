import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, Users, Building2, ChevronDown, Layers } from "lucide-react";
import ProductionOrderCard from "./ProductionOrderCard";
import EventKitchenCycleBar, { computeEventCycleMetrics } from "./EventKitchenCycleBar";
import EventsPaginationBar from "@/components/catering/EventsPaginationBar";

const EVENT_STATUS_STYLES = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  quoted: "bg-amber-50 text-amber-700 border-amber-200",
  enquiry: "bg-slate-50 text-slate-600 border-slate-200",
};

export function EventProductionSection({
  group,
  defaultOpen,
  reservations = [],
  recipesById,
  recipesByOutput,
  onStart,
  onComplete,
  onCancel,
  onReconcile,
  onUpdatePrepStage,
}) {
  const orders = group.orders || [];
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const activeCount = orders.filter((o) => o.status === "pending" || o.status === "in_progress").length;
  const isCompletedGroup =
    Boolean(group.isCompleted) ||
    group.eventStatus === "completed" ||
    (orders.length > 0 && activeCount === 0 && completedCount > 0);
  const [open, setOpen] = useState(() =>
    defaultOpen !== undefined ? defaultOpen : !isCompletedGroup
  );
  const cycleMetrics = computeEventCycleMetrics(orders, reservations, recipesById, recipesByOutput);

  return (
    <Card className="overflow-hidden border-slate-200 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm sm:text-base">{group.eventName}</span>
            {group.eventCode && (
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {group.eventCode}
              </span>
            )}
          </div>

          {group.eventStatus && (
            <Badge
              variant="outline"
              className={`capitalize text-xs ${EVENT_STATUS_STYLES[group.eventStatus] || EVENT_STATUS_STYLES.enquiry}`}
            >
              {group.eventStatus.replace(/_/g, " ")}
            </Badge>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            {group.eventDate && (
              <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                {group.eventDate}
              </span>
            )}
            {group.customerName && (
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {group.customerName}
              </span>
            )}
            {group.guests > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {group.guests} guests
              </span>
            )}
            {group.branchName && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {group.branchName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {cycleMetrics.unreconciledCompleted.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100 text-xs">
              {cycleMetrics.unreconciledCompleted.length} needs reconciliation
            </Badge>
          )}
          {activeCount > 0 && (
            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 text-xs">
              {activeCount} active
            </Badge>
          )}
          <Badge variant="outline" className="bg-slate-50 text-slate-700 text-xs">
            {completedCount}/{orders.length} completed
          </Badge>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="p-3 space-y-2.5">
          <EventKitchenCycleBar
            orders={orders}
            reservations={reservations}
            recipesById={recipesById}
            recipesByOutput={recipesByOutput}
            onOpenReconcile={onReconcile}
          />
          {orders.map((order) => (
            <ProductionOrderCard
              key={order.id}
              order={order}
              recipesById={recipesById}
              recipesByOutput={recipesByOutput}
              onStart={() => onStart(order)}
              onComplete={() => onComplete(order)}
              onCancel={() => onCancel(order)}
              onReconcile={onReconcile ? () => onReconcile(order) : undefined}
              onUpdatePrepStage={onUpdatePrepStage ? (stage) => onUpdatePrepStage(order, stage) : undefined}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

export function UnlinkedProductionSection({
  orders,
  totalCount,
  page = 0,
  totalPages = 1,
  pageSize = 10,
  hasPrevPage = false,
  hasNextPage = false,
  isFetchingPage = false,
  onPrevPage,
  onNextPage,
  onGoToPage,
  defaultOpen = false,
  recipesById,
  recipesByOutput,
  onStart,
  onComplete,
  onCancel,
  onReconcile,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionRef = useRef(null);
  const effectiveTotal = totalCount ?? (orders ? orders.length : 0);
  if ((!orders || orders.length === 0) && effectiveTotal === 0) return null;

  const activeCount = orders.filter((o) => o.status === "pending" || o.status === "in_progress").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  return (
    <Card ref={sectionRef} className="overflow-hidden border-slate-200 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="w-4 h-4 text-slate-600" />
          <span className="font-semibold text-slate-800 text-sm sm:text-base">
            General / Non-Event Production Batches
          </span>
          <span className="text-xs text-slate-500">
            (Regular kitchen stock & manual batches not linked to a catering event)
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeCount > 0 && (
            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-50 text-xs">
              {activeCount} active on page
            </Badge>
          )}
          <Badge variant="outline" className="bg-white text-slate-700 text-xs">
            {orders.length} of {effectiveTotal} batch{effectiveTotal === 1 ? "" : "es"}
          </Badge>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="p-3 space-y-2.5">
          <motion.div
            key={`regular-orders-page-${page}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="space-y-2.5"
          >
            {orders.map((order) => (
              <ProductionOrderCard
                key={order.id}
                order={order}
                recipesById={recipesById}
                recipesByOutput={recipesByOutput}
                onStart={() => onStart(order)}
                onComplete={() => onComplete(order)}
                onCancel={() => onCancel(order)}
                onReconcile={onReconcile ? () => onReconcile(order) : undefined}
              />
            ))}
          </motion.div>
          {totalPages > 1 && onGoToPage && (
            <EventsPaginationBar
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              currentCount={orders.length}
              totalCount={effectiveTotal}
              itemLabel="non-event batches"
              hasPrevPage={hasPrevPage}
              hasNextPage={hasNextPage}
              isFetchingPage={isFetchingPage}
              onPrevPage={onPrevPage}
              onNextPage={onNextPage}
              onGoToPage={onGoToPage}
              scrollTargetRef={sectionRef}
            />
          )}
        </div>
      )}
    </Card>
  );
}