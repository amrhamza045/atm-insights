import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPEN_PO = ["recommended", "pending_approval", "pending", "confirmed", "shipped"];

export default function LinkPoSelect({ request, onLink }) {
  const { data } = useQuery({
    queryKey: ["openPosForItem", request.branch_id, request.inventory_item_id],
    queryFn: async () => {
      const q = { status: { $in: OPEN_PO } };
      if (request.branch_id) q.branch_id = request.branch_id;
      const page = await base44.entities.PurchaseOrder.filter(q, { sort: "-created_date", limit: 200 });
      return page.items.filter(
        (po) =>
          po.rfq_status !== "open" &&
          po.rfq_status !== "quoted" &&
          (po.items || []).some((i) => i.inventory_item_id === request.inventory_item_id)
      );
    },
  });
  const pos = data || [];
  return (
    <Select value={request.purchase_order_id || ""} onValueChange={onLink}>
      <SelectTrigger className="w-64 h-9"><SelectValue placeholder={pos.length ? "Link to a PO…" : "No open PO has this item"} /></SelectTrigger>
      <SelectContent>
        {pos.map((po) => (
          <SelectItem key={po.id} value={po.id}>
            {po.order_number || po.id.slice(-6)} · {po.status}{po.catering_event_id === request.catering_event_id && request.catering_event_id ? " · this event" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}