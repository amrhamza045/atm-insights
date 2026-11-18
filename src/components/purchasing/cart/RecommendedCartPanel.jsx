import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, RefreshCw, ShoppingCart, CheckCircle, History } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import {
  buildRecommendedCart,
  cartSupplierGroups,
  cartTotal,
  loadCartEligibleEvents,
  loadCartReferenceData,
  makeManualLine,
  todayIso,
} from "./recommendedCart";
import { finalizeRecommendedCart } from "./finalizeCart";
import CartEventSelector from "./CartEventSelector";
import CartSupplierGroup from "./CartSupplierGroup";
import MultiPoWarning from "./MultiPoWarning";
import UnmappedLinesNotice from "./UnmappedLinesNotice";
import AddCartItemDialog from "./AddCartItemDialog";
import { eventCartStatus, loadEventCartOrders } from "./eventCartStatus";
import PurchasedCartHistory from "./PurchasedCartHistory";


export default function RecommendedCartPanel({ event }) {
  const scoped = !!event;
  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedIds, setSelectedIds] = useState(scoped ? [event.id] : []);
  const [cart, setCart] = useState(null);
  const [notes, setNotes] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [building, setBuilding] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: allEvents = [] } = useQuery({
    queryKey: ["cart-eligible-events", selectedBranchId],
    queryFn: () => loadCartEligibleEvents(selectedBranchId),
    enabled: !scoped,
  });

  const { data: reference } = useQuery({
    queryKey: ["cart-reference-data", selectedBranchId],
    queryFn: () => loadCartReferenceData(selectedBranchId),
  });

  const { data: cartOrders = [] } = useQuery({
    queryKey: ["event-cart-orders"],
    queryFn: loadEventCartOrders,
    enabled: !scoped,
  });

  // Events stay selectable after a purchase so remaining shortfalls can be recalculated.
  const availableEvents = allEvents;

  const shownEvents = useMemo(
    () => availableEvents.filter((e) => (!from || e.event_date >= from) && (!to || e.event_date <= to)),
    [availableEvents, from, to]
  );

  const selectedEvents = scoped ? [event] : availableEvents.filter((e) => selectedIds.includes(e.id));

  // Arriving from the Shortfall Queue / event planning: preselect and build straight away.
  const autoIds = useRef(
    scoped ? null : new URLSearchParams(window.location.search).get("cart_events")?.split(",").filter(Boolean)
  );
  useEffect(() => {
    if (!autoIds.current?.length || !allEvents.length) return;
    const ids = autoIds.current;
    autoIds.current = null;
    const evs = allEvents.filter((e) => ids.includes(e.id));
    setSelectedIds(evs.map((e) => e.id));
    if (evs.length) generateFor(evs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents]);

  const groups = cart ? cartSupplierGroups(cart.lines) : [];
  const supplierCount = new Set(
    (cart?.lines || []).filter((l) => (Number(l.quantity) || 0) > 0).map((l) => l.supplier_id || "__none__")
  ).size;
  const total = cart ? cartTotal(cart.lines) : 0;
  const hasUnassigned = (cart?.lines || []).some((l) => !l.supplier_id && (Number(l.quantity) || 0) > 0);
  const buyable = (cart?.lines || []).filter((l) => l.supplier_id && (Number(l.quantity) || 0) > 0);
  const purchasedOrders = useMemo(
    () => cartOrders.filter(
      (o) =>
        (o.purchase_recorded_invoice_id || o.status === "delivered") &&
        (!selectedBranchId || !o.branch_id || o.branch_id === selectedBranchId)
    ),
    [cartOrders, selectedBranchId]
  );

  const generate = () => {
    if (!selectedEvents.length) return toast.error("Select at least one event");
    return generateFor(selectedEvents);
  };

  async function generateFor(evs) {
    setBuilding(true);
    try {
      const built = await buildRecommendedCart({ events: evs, branchId: selectedBranchId });
      setCart(built);
      if (!built.lines.length) toast.message("Nothing to buy — free stock already covers these events");
      else toast.success(`${built.lines.length} item(s) recommended`);
    } catch {
      toast.error("Could not build the recommended cart");
    } finally {
      setBuilding(false);
    }
  }

  const changeLine = (id, patch) =>
    setCart((c) => ({
      ...c,
      lines: c.lines.map((l) => (l.inventory_item_id === id ? { ...l, ...patch } : l)),
    }));

  const removeLine = (id) =>
    setCart((c) => ({ ...c, lines: c.lines.filter((l) => l.inventory_item_id !== id) }));

  const addLine = (item) => {
    const ref = cart?.reference || reference;
    if (!ref) return;
    setCart((c) => ({ ...c, lines: [...c.lines, makeManualLine(item, ref, selectedEvents)] }));
  };

  const finalize = async () => {
    setFinalizing(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const res = await finalizeRecommendedCart({
        lines: cart.lines,
        events: selectedEvents,
        branch: selectedBranch,
        userEmail: user?.email,
        notes,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }),
        queryClient.invalidateQueries({ queryKey: ["event-cart-orders"] }),
      ]);
      toast.success(
        `${res.created.length} purchase order(s) created as Recommended — one supplier per order, each still needs approval by someone else`
      );
      setCart(null);
      setNotes("");
    } catch (err) {
      toast.error(err?.message || "Could not create the purchase orders");
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="space-y-4">
      {!scoped && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowHistory((value) => !value)} className="gap-2">
            <History className="h-4 w-4" />
            {showHistory ? "Back to current carts" : "History"}
          </Button>
        </div>
      )}

      {showHistory && !scoped ? (
        <PurchasedCartHistory orders={purchasedOrders} />
      ) : (
        <>
      {!scoped && (
        <CartEventSelector
          events={shownEvents}
          cartOrders={cartOrders}
          selectedIds={selectedIds}
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
          onToggle={(id) =>
            setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
          }
          onSelectAll={() => setSelectedIds(shownEvents.map((e) => e.id))}
          onClear={() => setSelectedIds([])}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generate} disabled={building || !selectedEvents.length} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {building ? "Calculating..." : cart ? "Recalculate cart" : "Generate recommended cart"}
        </Button>
        {!scoped && (
          <span className="text-sm text-slate-500">
            {selectedEvents.length} event(s) selected
          </span>
        )}
      </div>

      {cart && (
        <>
          <UnmappedLinesNotice unmapped={cart.unmapped} missingQuote={cart.missingQuote} />

          <Card className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Cart ({cart.lines.length} item{cart.lines.length === 1 ? "" : "s"})
              </h4>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add item
              </Button>
            </div>

            {cart.lines.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                Free stock covers everything these events need. Add an item manually if you know otherwise.
              </p>
            ) : (
              <div className="space-y-4">
                {groups.map((g) => (
                  <CartSupplierGroup
                    key={g.supplier_id || "unassigned"}
                    group={g}
                    suppliers={reference?.suppliers || []}
                    reference={cart?.reference || reference}
                    onChangeLine={changeLine}
                    onRemoveLine={removeLine}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-end p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-sm text-slate-600 mr-2">Cart total:</span>
              <span className="text-lg font-bold text-amber-700">{formatCurrency(total)}</span>
            </div>
          </Card>

          <MultiPoWarning supplierCount={supplierCount} />

          <Card className="p-4 space-y-3">
            <div>
              <Label>Notes for the purchase order(s)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything the approver or buyer should know"
              />
            </div>

            {hasUnassigned && (
              <p className="text-xs text-red-600">
                Some lines have no supplier — assign one or set their quantity to zero before finalizing.
              </p>
            )}

            <p className="text-xs text-slate-500">
              Finalizing creates draft <strong>Recommended</strong> order(s). Nothing is bought and no stock
              moves — each order must be approved by someone other than you, then the real purchase recorded.
            </p>

            <Button
              onClick={finalize}
              disabled={
                finalizing ||
                !buyable.length ||
                hasUnassigned
              }
              className="gap-2 w-full sm:w-auto"
            >
              <CheckCircle className="w-4 h-4" />
              {finalizing
                ? "Creating..."
                : supplierCount > 1
                  ? `Finalize — create ${supplierCount} purchase orders`
                  : "Finalize — create purchase order"}
            </Button>
          </Card>
        </>
      )}

      <AddCartItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        inventoryItems={reference?.inventoryItems || []}
        existingIds={(cart?.lines || []).map((l) => l.inventory_item_id)}
        onAdd={addLine}
      />
        </>
      )}
    </div>
  );
}