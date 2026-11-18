import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import LinkPoSelect from "@/components/purchasing/LinkPoSelect";

const STATUS = {
  open: "bg-amber-100 text-amber-800", po_linked: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-700", resolved: "bg-slate-100 text-slate-700", cancelled: "bg-red-100 text-red-700",
};

export default function KitchenRequestsPanel() {
  const { selectedBranchId } = useBranch();
  const [showClosed, setShowClosed] = useState(false);
  const qc = useQueryClient();
  const query = { status: { $in: showClosed ? ["received", "resolved", "cancelled"] : ["open", "po_linked"] } };
  if (selectedBranchId) query.branch_id = selectedBranchId;

  const { data, isLoading } = useQuery({
    queryKey: ["kitchenPurchaseRequests", selectedBranchId, showClosed],
    queryFn: () => base44.entities.KitchenPurchaseRequest.filter(query, { sort: "-requested_at", limit: 100 }),
  });

  const act = async (request_id, action, extra = {}) => {
    try {
      await base44.functions.invoke("manageKitchenPurchaseRequest", { request_id, action, ...extra });
      qc.invalidateQueries({ queryKey: ["kitchenPurchaseRequests"] });
      toast.success("Request updated");
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    }
  };

  const items = data?.items || [];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Shortages reported by the kitchen. Create a PO in Purchase Orders if none exists, then link it here.</p>
        <Button size="sm" variant="outline" onClick={() => setShowClosed(!showClosed)}>{showClosed ? "Show active" : "Show closed"}</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        : items.length === 0 ? <Card className="p-8 text-center text-slate-500"><ChefHat className="w-10 h-10 mx-auto mb-2 text-slate-300" />No kitchen requests</Card>
        : items.map((r) => (
          <Card key={r.id} className="p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{r.inventory_item_name} · {r.quantity_requested} {r.unit}</p>
                <p className="text-xs text-slate-500">
                  Batch: {r.recipe_name} ×{r.batches} · {r.catering_event_name ? `Event: ${r.catering_event_name}` : "No event"}
                  {r.needed_by_date && ` · needed by ${r.needed_by_date}`} · by {r.requested_by}
                </p>
                {r.note && <p className="text-xs text-slate-600 mt-1">“{r.note}”</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-slate-800 text-white">Kitchen</Badge>
                <Badge className={STATUS[r.status]}>{r.status.replace("_", " ")}</Badge>
                {r.purchase_order_number && <Badge variant="outline">{r.purchase_order_number}</Badge>}
              </div>
            </div>
            {!showClosed && (
              <div className="flex flex-wrap items-center gap-2">
                <LinkPoSelect request={r} onLink={(poId) => act(r.id, "link_po", { purchase_order_id: poId })} />
                <Button size="sm" variant="outline" onClick={() => act(r.id, "received")}>Mark received</Button>
                <Button size="sm" variant="outline" onClick={() => act(r.id, "resolved")}>Resolve</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => act(r.id, "cancelled")}>Cancel</Button>
              </div>
            )}
          </Card>
        ))}
    </div>
  );
}