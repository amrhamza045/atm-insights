import { Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function UnpaidDeliveryOrders({ orders, clients, selectedOrderId, onSelect, onDeselect }) {
  if (!orders || orders.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <h3 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
        <Truck className="w-4 h-4" />
        Pending Payment — Delivery Orders ({orders.length})
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {orders.map(order => {
          const customer = clients.find(c => c.id === order.customer_id);
          const isSelected = selectedOrderId === order.id;
          return (
            <div
              key={order.id}
              onClick={() => isSelected ? onDeselect() : onSelect(order)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                isSelected
                  ? "bg-orange-200 border-orange-400"
                  : "bg-white border-orange-200 hover:bg-orange-100"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{customer?.name || order.customer_name || "Unknown"}</p>
                <p className="text-xs text-slate-500">{order.delivery_company_name} • {order.items?.length || 0} items</p>
                <p className="text-xs text-slate-400">{new Date(order.created_date).toLocaleTimeString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-orange-700">{formatCurrency(order.total)}</p>
                <Badge className="bg-orange-100 text-orange-800 text-xs">{order.status}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}