import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import EventScopeChip, { useUrlEventId } from "@/components/shared/EventScopeChip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { logSuccess } from "@/components/utils/auditLogHelper";
import ShortageRequestDialog from "@/components/admin/production/ShortageRequestDialog";
import ProductionBatchToolbar from "@/components/admin/production/ProductionBatchToolbar";
import { EventProductionSection, UnlinkedProductionSection } from "@/components/admin/production/EventProductionSection";
import EventsPaginationBar from "@/components/catering/EventsPaginationBar";
import usePaginatedProductionOrders from "@/components/admin/production/usePaginatedProductionOrders";
import { CreateOrderDialog, CompleteOrderDialog } from "@/components/admin/production/ProductionOrderDialogs";
import BatchReconciliationDialog from "@/components/admin/production/BatchReconciliationDialog";
import { getCompanyDateBounds } from "@/components/admin/production/fuzzyProductionSearch";

const INITIAL_FILTERS = {
  search: "",
  quickFilter: "today",
  batchStatus: "all",
  productionType: "all",
  recipeId: "all",
  eventStatus: "all",
  branchFilter: "all",
  sortBy: "auto",
  dateFrom: "",
  dateTo: "",
};

export default function ProductionOrderManager() {
  const [showCreate, setShowCreate] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(null);
  const [reconcilingOrder, setReconcilingOrder] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [, setCheckingStock] = useState(false);
  const [shortageOrder, setShortageOrder] = useState(null);

  const queryClient = useQueryClient();
  const { selectedBranchId, selectedBranch, branches = [] } = useBranch();
  const scopedEventId = useUrlEventId();

  const bounds = getCompanyDateBounds();

  const { data: allRecipes = [] } = useQuery({
    queryKey: ["productionAllRecipes"],
    queryFn: () => base44.entities.Recipe.list("-created_date", 500),
  });

  const { recipesById, recipesByOutput } = useMemo(() => {
    const byId = new Map();
    const byOut = new Map();
    const list = Array.isArray(allRecipes) ? allRecipes : allRecipes?.items || [];
    for (const r of list) {
      if ((r.ingredients || []).length > 0) {
        byId.set(r.id, r);
      }
      if (r.status === "active" && r.output_item_id && (r.ingredients || []).length > 0) {
        const arr = byOut.get(r.output_item_id) || [];
        arr.push(r);
        byOut.set(r.output_item_id, arr);
      }
    }
    return { recipesById: byId, recipesByOutput: byOut };
  }, [allRecipes]);

  const { data: orderRecipeIds = [] } = useQuery({
    queryKey: ["productionOrderRecipeOptions", selectedBranchId],
    queryFn: async () => {
      const query = selectedBranchId ? { branch_id: selectedBranchId } : {};
      const agg = await base44.entities.ProductionOrder.aggregate({
        query,
        groupBy: "recipe_id",
      });
      return (agg?.rows || []).map((r) => r.recipe_id).filter(Boolean);
    },
  });

  const recipeOptions = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(allRecipes) ? allRecipes : allRecipes?.items || [];
    for (const r of list) {
      if (r.id && !map.has(r.id)) {
        map.set(r.id, { id: r.id, name: r.name || "Unnamed Recipe" });
      }
    }
    for (const id of orderRecipeIds) {
      if (id && !map.has(id)) {
        map.set(id, { id, name: "Recipe " + id.slice(-6) });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allRecipes, orderRecipeIds]);

  const {
    regularOnly,
    eventGroups,
    reservationsByEventId,
    pageEventBatchCount,
    totalEventsCount,
    totalEventBatchesCount,
    eventPage,
    totalEventPages,
    eventPageSize,
    hasNextEventPage,
    hasPrevEventPage,
    isFetchingEventPage,
    goToNextEventPage,
    goToPrevEventPage,
    goToEventPage,
    unlinkedOrders,
    totalRegularBatches,
    regularPage,
    totalRegularPages,
    regularPageSize,
    hasNextRegularPage,
    hasPrevRegularPage,
    isFetchingRegularPage,
    goToNextRegularPage,
    goToPrevRegularPage,
    goToRegularPage,
    isLoading,
    totalVisibleBatches,
    totalMatchingBatches,
  } = usePaginatedProductionOrders({
    selectedBranchId,
    scopedEventId,
    filters,
    bounds,
  });

  const totalMatchingEvents = totalEventsCount;

  const handleUpdatePrepStage = async (order, stage) => {
    const user = await base44.auth.me().catch(() => null);
    updateStatus.mutate({
      id: order.id,
      data: {
        prep_stage: stage,
        prep_updated_by: user?.email || "",
        ...(stage === "handed_off"
          ? {
              handoff_to: "Event Service",
              handoff_by: user?.email || "",
              handoff_date: new Date().toISOString(),
            }
          : {}),
      },
    });
    toast.success(
      stage === "handed_off"
        ? "Batch marked handed off to event service"
        : `Prep stage updated to ${stage}`
    );
  };

  const invalidateProductionQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["productionOrders"] });
    queryClient.invalidateQueries({ queryKey: ["productionOrderRecipeOptions"] });
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.ProductionOrder.update(id, data),
    onSuccess: (_, { id, data }) => {
      invalidateProductionQueries();
      logSuccess("update", "ProductionOrder", `Updated order status to ${data.status}`, { entityId: id });
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handleStart = async (order) => {
    setCheckingStock(true);
    try {
      const res = await base44.functions.invoke("submitKitchenPurchaseRequest", {
        production_order_id: order.id,
        mode: "preview",
      });
      if ((res.data?.shortages || []).length + (res.data?.sub_shortages || []).length > 0) {
        setShortageOrder(order);
        return;
      }
      const user = await base44.auth.me();
      updateStatus.mutate({
        id: order.id,
        data: { status: "in_progress", started_by: user?.email, started_date: new Date().toISOString() },
      });
      toast.success("Production started");
    } catch (error) {
      toast.error(error?.response?.data?.error || `Failed to start production: ${error.message}`);
    } finally {
      setCheckingStock(false);
    }
  };

  const handleCancel = (order) => {
    if (confirm("Cancel this production order?")) {
      updateStatus.mutate({ id: order.id, data: { status: "cancelled" } });
      toast.success("Order cancelled");
    }
  };

  const handleCompleteSuccess = () => {
    setCompletingOrder(null);
    invalidateProductionQueries();
    queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-slate-500">
            {regularOnly ? (
              <>
                Showing <strong>{unlinkedOrders.length}</strong> of{" "}
                <strong>{totalRegularBatches}</strong> non-event batch(es)
              </>
            ) : (
              <>
                Showing <strong>{totalVisibleBatches}</strong> of{" "}
                <strong>{totalMatchingBatches}</strong> batch(es) across{" "}
                <strong>{eventGroups.length}</strong> of{" "}
                <strong>{totalMatchingEvents}</strong> event(s)
              </>
            )}
          </p>
          <EventScopeChip eventId={scopedEventId} />
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4" /> Create New Batch
        </Button>
      </div>

      <ProductionBatchToolbar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(INITIAL_FILTERS)}
        recipes={recipeOptions}
        branches={branches}
        showBranchFilter={!selectedBranchId && branches.length > 1}
      />

      {totalVisibleBatches === 0 ? (
        <Card className="p-8 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-1">
            No production batches match your filters
          </p>
          <p className="text-sm text-slate-400">
            Try adjusting your search query, quick filter, or filter criteria
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {!regularOnly && (
            <motion.div
              key={`prod-events-page-${eventPage}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="space-y-4"
            >
              {eventGroups.map((group) => (
                <EventProductionSection
                  key={group.key}
                  group={group}
                  reservations={reservationsByEventId.get(group.eventId) || []}
                  recipesById={recipesById}
                  recipesByOutput={recipesByOutput}
                  onStart={handleStart}
                  onComplete={setCompletingOrder}
                  onCancel={handleCancel}
                  onReconcile={setReconcilingOrder}
                  onUpdatePrepStage={handleUpdatePrepStage}
                />
              ))}
            </motion.div>
          )}

          {!regularOnly && eventGroups.length > 0 && (
            <EventsPaginationBar
              page={eventPage}
              totalPages={totalEventPages}
              pageSize={eventPageSize}
              currentCount={eventGroups.length}
              totalCount={totalEventsCount}
              itemLabel="events"
              secondarySummary={`${pageEventBatchCount} of ${totalEventBatchesCount} event batch(es)`}
              hasPrevPage={hasPrevEventPage}
              hasNextPage={hasNextEventPage}
              isFetchingPage={isFetchingEventPage}
              onPrevPage={goToPrevEventPage}
              onNextPage={goToNextEventPage}
              onGoToPage={goToEventPage}
            />
          )}

          <UnlinkedProductionSection
            orders={unlinkedOrders}
            totalCount={totalRegularBatches}
            page={regularPage}
            totalPages={totalRegularPages}
            pageSize={regularPageSize}
            hasPrevPage={hasPrevRegularPage}
            hasNextPage={hasNextRegularPage}
            isFetchingPage={isFetchingRegularPage}
            onPrevPage={goToPrevRegularPage}
            onNextPage={goToNextRegularPage}
            onGoToPage={regularOnly ? undefined : goToRegularPage}
            defaultOpen={regularOnly}
            recipesById={recipesById}
            recipesByOutput={recipesByOutput}
            onStart={handleStart}
            onComplete={setCompletingOrder}
            onCancel={handleCancel}
          />

          {regularOnly && unlinkedOrders.length > 0 && (
            <EventsPaginationBar
              page={regularPage}
              totalPages={totalRegularPages}
              pageSize={regularPageSize}
              currentCount={unlinkedOrders.length}
              totalCount={totalRegularBatches}
              itemLabel="non-event batches"
              hasPrevPage={hasPrevRegularPage}
              hasNextPage={hasNextRegularPage}
              isFetchingPage={isFetchingRegularPage}
              onPrevPage={goToPrevRegularPage}
              onNextPage={goToNextRegularPage}
              onGoToPage={goToRegularPage}
            />
          )}
        </div>
      )}

      {showCreate && (
        <CreateOrderDialog
          branchId={selectedBranchId}
          branchName={selectedBranch?.name}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            invalidateProductionQueries();
          }}
        />
      )}

      {shortageOrder && (
        <ShortageRequestDialog
          order={shortageOrder}
          onClose={(created) => {
            setShortageOrder(null);
            if (created) invalidateProductionQueries();
          }}
        />
      )}

      {completingOrder && (
        <CompleteOrderDialog
          order={completingOrder}
          onClose={() => setCompletingOrder(null)}
          onSuccess={handleCompleteSuccess}
        />
      )}

      {reconcilingOrder && (
        <BatchReconciliationDialog
          order={reconcilingOrder}
          onClose={() => setReconcilingOrder(null)}
          onReconciled={() => {
            setReconcilingOrder(null);
            invalidateProductionQueries();
            queryClient.invalidateQueries({ queryKey: ["productionCateringReservations"] });
            queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
          }}
        />
      )}
    </div>
  );
}