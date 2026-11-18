import { Truck, UtensilsCrossed, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const ICONS = { delivery: Truck, dine_in: UtensilsCrossed, takeaway: ShoppingBag };
const COLORS = {
  delivery: { bg: "bg-orange-50", border: "border-orange-200", title: "text-orange-800", card: "bg-white border-orange-200 hover:bg-orange-100", selected: "bg-orange-200 border-orange-400", amount: "text-orange-700", badge: "bg-orange-100 text-orange-800" },
  dine_in:  { bg: "bg-blue-50",   border: "border-blue-200",   title: "text-blue-800",   card: "bg-white border-blue-200 hover:bg-blue-100",   selected: "bg-blue-200 border-blue-400",   amount: "text-blue-700",   badge: "bg-blue-100 text-blue-800"   },
  takeaway: { bg: "bg-purple-50", border: "border-purple-200", title: "text-purple-800", card: "bg-white border-purple-200 hover:bg-purple-100", selected: "bg-purple-200 border-purple-400", amount: "text-purple-700", badge: "bg-purple-100 text-purple-800" },
};
const LABELS = { delivery: "Delivery", dine_in: "Dine-In", takeaway: "Takeaway" };

export default function UnpaidOrdersPanel({ orders, clients, selectedOrderId, onSelect, onDeselect, orderType = "delivery" }) {
  if (!orders || orders.length === 0) return null;

  const Icon = ICONS[orderType] || Truck;
  const c = COLORS[orderType] || COLORS.delivery;
  const label = LABELS[orderType] || orderType;

  return (
    <div className={`mb-4 p-4 ${c.bg} border ${c.border} rounded-lg`}>
      <h3 className={`text-sm font-semibold ${c.title} mb-3 flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
        Pending Payment — {label} Orders ({orders.length})
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {orders.map(order => {
          const customer = clients.find(c => c.id === order.customer_id);
          const isSelected = selectedOrderId === order.id;
          return (
            <div
              key={order.id}
              onClick={() => isSelected ? onDeselect() : onSelect(order)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? c.selected : c.card}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{customer?.name || order.customer_name || "Unknown"}</p>
                <p className="text-xs text-slate-500">
                  {order.table_number ? `Table ${order.table_number}` : order.delivery_company_name || ""} • {order.items?.length || 0} items
                </p>
                <p className="text-xs text-slate-400">{new Date(order.created_date).toLocaleTimeString()}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${c.amount}`}>{formatCurrency(order.total)}</p>
                <Badge className={`${c.badge} text-xs`}>{order.status}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}