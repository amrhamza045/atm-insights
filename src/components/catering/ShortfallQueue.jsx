import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { daysUntil } from "./cateringLogic";
import FilterSelect from "./all/FilterSelect";
import { WHEN_OPTIONS, whenQuery } from "./all/allEventsQuery";
import { netShortfallsAgainstOpenOrders } from "./openOrderCover";
import { useBranch } from "@/components/branches/BranchContext";

const OPEN_STATUSES = ["none", "po_cancelled"];

/**
 * Cross-event queue of materials that are still MISSING (no live purchase order).
 * Ordering happens only through the Recommended Cart in Purchases, so a shortfall
 * can't be ordered twice.
 */
export default function ShortfallQueue({ eventId = null }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => new Set());
  const [when, setWhen] = useState("upcoming");
  const { selectedBranchId } = useBranch();

  const { data, isLoading } = useQuery({
    queryKey: ["catering-shortfall-queue", eventId || when, eventId ? "" : selectedBranchId],
    queryFn: async () => {
      // Only reservations still short — for the scoped event, or the chosen event dates
      // in the branch picked at the top — and only the events they belong to.
      const scope = eventId
        ? { event_id: eventId }
        : { ...whenQuery("event_date", when).query, ...(selectedBranchId ? { branch_id: selectedBranchId } : {}) };
      const [reservations, items, orders] = await Promise.all([
        base44.entities.CateringReservation.filter({ status: "reserved", shortfall_quantity: { $gt: 0 }, ...scope }, "-created_date", 1000),
        base44.entities.InventoryItem.list("-created_date", 1000),
        // What open catering orders already cover isn't missing — same netting as the Recommended Cart.
        base44.entities.PurchaseOrder.filter({ order_source: "catering", status: { $nin: ["cancelled", "delivered"] } }, "-created_date", 500),
      ]);
      const eventIds = [...new Set(reservations.map((r) => r.event_id).filter(Boolean))];
      const events = eventIds.length
        ? await base44.entities.CateringEvent.filter({ id: { $in: eventIds } }, "-event_date", eventIds.length)
        : [];
      return { reservations, events, items, orders };
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const eventById = new Map(data.events.map((e) => [e.id, e]));
    const itemById = new Map(data.items.map((i) => [i.id, i]));
    const cover = netShortfallsAgainstOpenOrders(data.reservations, data.orders);
    return data.reservations
      .filter((r) => (!eventId || r.event_id === eventId) && (Number(r.shortfall_quantity) || 0) > 0 && OPEN_STATUSES.includes(r.procurement_status || "none"))
      .map((r) => {
        const event = eventById.get(r.event_id);
        if (!event || !["confirmed", "in_progress"].includes(event.status)) return null;
        const covered = cover.get(r.id) || { onOrder: 0, missing: Number(r.shortfall_quantity) || 0, orders: [] };
        if (covered.missing <= 0) return null;
        const lead = Number(itemById.get(r.inventory_item_id)?.lead_time_days) || 2;
        const daysLeft = daysUntil(r.needed_by_date || r.event_date);
        return { r, event, lead, daysLeft, atRisk: daysLeft <= lead, covered };
      })
      .filter(Boolean)
      .sort((a, b) => (b.atRisk ? 1 : 0) - (a.atRisk ? 1 : 0) || (a.r.needed_by_date || a.r.event_date || "").localeCompare(b.r.needed_by_date || b.r.event_date || ""));
  }, [data, eventId]);

  const atRiskCount = rows.filter((x) => x.atRisk).length;
  const allSelected = rows.length > 0 && rows.every((x) => selected.has(x.r.id));

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const createCart = () => {
    const eventIds = [...new Set(rows.filter((x) => selected.has(x.r.id)).map((x) => x.event.id))];
    if (!eventIds.length) return toast.error("Select at least one missing item");
    navigate(`/PurchasesHub?cart_events=${eventIds.join(",")}`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-slate-400" /> Shortfall Queue
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Missing materials across confirmed and in-progress events that open purchase orders don't cover yet. Select them to
            build a recommended cart in Purchases.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge variant="outline" className="text-xs">{rows.length} missing</Badge>
            <Badge className={`text-xs ${atRiskCount ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
              {atRiskCount} at risk
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!eventId && <FilterSelect value={when} onChange={(v) => { setWhen(v); setSelected(new Set()); }} options={WHEN_OPTIONS} />}
          <Button variant="outline" disabled={!rows.length} onClick={() => setSelected(allSelected ? new Set() : new Set(rows.map((x) => x.r.id)))}>
            {allSelected ? "Clear selection" : `Select all (${rows.length})`}
          </Button>
          <Button className="gap-1.5" disabled={selected.size === 0} onClick={createCart}>
            <ShoppingCart className="w-4 h-4" /> Create recommended cart
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading shortfalls…</p>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">
          Nothing missing — every confirmed event's needs are covered by free stock or a purchase order.
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map(({ r, event, lead, daysLeft, atRisk, covered }) => (
            <Card key={r.id} className={`p-3 ${atRisk ? "border-red-300 bg-red-50" : ""}`}>
              <div className="flex items-start gap-3">
                <Checkbox className="mt-1" checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium text-sm text-slate-900">{r.inventory_item_name}</p>
                    {atRisk && (
                      <Badge className="bg-red-600 text-white text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" /> At risk
                      </Badge>
                    )}
                    {r.procurement_status === "po_cancelled" && <Badge className="bg-red-100 text-red-700 text-xs">PO cancelled</Badge>}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Missing <span className="font-semibold">{covered.missing} {r.unit}</span> of {r.quantity_reserved} needed
                    {r.purpose === "production_input" ? ` (input for ${r.produced_item_name})` : ""}
                    {covered.onOrder > 0 ? ` · ${covered.onOrder} ${r.unit} already on order (${covered.orders.join(", ")})` : ""}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {event.event_name} · needed by {r.needed_by_date || r.event_date} ({daysLeft} day(s)) · lead time {lead} day(s)
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}