import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

/** Closes every open order on a table and frees the table (manager action). */
export default function ForceCloseTableButton({ table, updateTableMutation, queryClient, onClosed }) {
  const forceClose = async () => {
    if (!confirm(`Force close Table ${table.table_number}?`)) return;
    try {
      const tableOrders = await base44.entities.Order.filter({ table_id: table.id, order_type: "dine_in" });
      for (const o of tableOrders) {
        if (o.status !== "completed" && o.status !== "cancelled") {
          await base44.entities.Order.update(o.id, { status: "completed" });
        }
      }
      await updateTableMutation.mutateAsync({ id: table.id, data: { status: "empty", current_order_id: null } });
      onClosed?.();
      await queryClient.invalidateQueries({ queryKey: ["tables"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.refetchQueries({ queryKey: ["orders", "dine_in_status"] });
      toast.success(`Table ${table.table_number} force closed successfully`);
    } catch {
      toast.error("Failed to close table");
    }
  };

  return (
    <Button variant="outline" onClick={forceClose} className="w-full gap-2 border-red-600 text-red-700 hover:bg-red-50">
      <X className="w-4 h-4" /> Force Close Table
    </Button>
  );
}