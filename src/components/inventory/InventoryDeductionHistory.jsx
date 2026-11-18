import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, Trash2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function InventoryDeductionHistory({ item }) {
  const unit = item.selling_unit_label || item.unit || (item.selling_unit === "weight" ? "kg" : "pcs");

  // Fetch recent paid/completed orders
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["ordersForInventory", item.id],
    queryFn: async () => {
      // Fetch paid and completed orders separately since SDK may not support array filter.
      // Only sales of the item's own branch draw on its stock.
      const branch = item.branch_id ? { branch_id: item.branch_id } : {};
      const [paidOrders, completedOrders] = await Promise.all([
        base44.entities.Order.filter({ status: "paid", ...branch }, "-created_date", 200),
        base44.entities.Order.filter({ status: "completed", ...branch }, "-created_date", 200),
      ]);
      return [...paidOrders, ...completedOrders];
    }
  });

  // Fetch waste declarations for this item
  const { data: wastes = [], isLoading: loadingWastes } = useQuery({
    queryKey: ["wastesForInventory", item.id],
    queryFn: () => base44.entities.WasteDeclaration.filter(
      { inventory_item_id: item.id },
      "-created_date",
      50
    )
  });

  // Fetch menu items that use this inventory item in their recipe
  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ["menuItemsForInventory", item.id],
    queryFn: () => base44.entities.MenuItem.list("name")
  });

  const isLoading = loadingOrders || loadingWastes || loadingMenu;

  // Find menu items that reference this inventory item
  const relatedMenuItemIds = new Set();
  const relatedMenuItemQtyMap = {}; // menuItemId -> qty_needed per unit

  menuItems.forEach(mi => {
    const checkRecipe = (recipe) => {
      if (!recipe) return;
      recipe.forEach(r => {
        if (r.inventory_item_id === item.id) {
          relatedMenuItemIds.add(mi.id);
          relatedMenuItemQtyMap[mi.id] = relatedMenuItemQtyMap[mi.id] || {};
          relatedMenuItemQtyMap[mi.id]["default"] = r.quantity_needed;
        }
      });
    };
    checkRecipe(mi.recipe);
    // Also check size_recipes
    if (mi.size_recipes) {
      Object.entries(mi.size_recipes).forEach(([sizeName, recipe]) => {
        if (recipe) {
          recipe.forEach(r => {
            if (r.inventory_item_id === item.id) {
              relatedMenuItemIds.add(mi.id);
              relatedMenuItemQtyMap[mi.id] = relatedMenuItemQtyMap[mi.id] || {};
              relatedMenuItemQtyMap[mi.id][sizeName] = r.quantity_needed;
            }
          });
        }
      });
    }
  });

  // Build order deduction rows
  const orderDeductions = [];
  orders.forEach(order => {
    if (!order.items) return;
    order.items.forEach(orderItem => {
      if (!relatedMenuItemIds.has(orderItem.menu_item_id)) return;
      const qtyMap = relatedMenuItemQtyMap[orderItem.menu_item_id] || {};

      // Resolve size: try stored selectedSize first, then infer from item name
      let sizeName = typeof orderItem.selectedSize === "object"
        ? orderItem.selectedSize?.name
        : (orderItem.selectedSize || null);

      // If no stored size, try to infer from order item name by matching known size keys
      if (!sizeName) {
        const knownSizes = Object.keys(qtyMap).filter(k => k !== "default");
        const itemNameUpper = (orderItem.name || "").toUpperCase();
        sizeName = knownSizes.find(s => itemNameUpper.includes(s.toUpperCase())) || null;
      }

      const qtyPerUnit = (sizeName && qtyMap[sizeName]) || qtyMap["default"] || 0;
      const totalDeducted = qtyPerUnit * (orderItem.quantity || 1);
      if (totalDeducted > 0) {
        orderDeductions.push({
          type: "order",
          orderId: order.id,
          orderRef: order.id.slice(-8).toUpperCase(),
          date: order.created_date,
          itemName: orderItem.name,
          size: sizeName,
          qty: orderItem.quantity || 1,
          deducted: totalDeducted,
          customer: order.customer_name || "Walk-in",
          status: order.status
        });
      }
    });
  });

  // Sort order deductions by date desc
  orderDeductions.sort((a, b) => new Date(b.date) - new Date(a.date));

  const hasData = orderDeductions.length > 0 || wastes.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading deduction history...
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="py-4 text-sm text-slate-400 text-center">
        No deduction history found for this item.
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Order Deductions */}
      {orderDeductions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <ShoppingBag className="w-3 h-3" /> Order Deductions ({orderDeductions.length})
          </h4>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b text-left text-slate-500">
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Deducted</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {orderDeductions.slice(0, 50).map((d, idx) => (
                  <tr key={`${d.orderId}-${idx}`} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-semibold text-slate-700">#{d.orderRef}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {d.date ? format(new Date(d.date), "MMM d, HH:mm") : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{d.customer}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {d.itemName}{d.size ? ` (${d.size})` : ""} ×{d.qty}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-red-600">
                      -{d.deducted} {unit}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="secondary" className="text-xs capitalize">{d.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Link
                        to="/Cashier"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                        title="View in Cashier › Orders"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Waste Deductions */}
      {wastes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Waste Declarations ({wastes.length})
          </h4>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b text-left text-slate-500">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2 text-right">Quantity</th>
                  <th className="px-3 py-2 text-right">Cost Impact</th>
                  <th className="px-3 py-2">Declared By</th>
                </tr>
              </thead>
              <tbody>
                {wastes.map((w, idx) => (
                  <tr key={w.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500">
                      {w.created_date ? format(new Date(w.created_date), "MMM d, HH:mm") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {w.reason?.replace(/_/g, " ") || "—"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{w.notes || "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-red-600">
                      -{w.quantity_wasted} {unit}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {w.cost_impact ? `${w.cost_impact.toFixed(2)} EGP` : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">
                      {w.declared_by || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}