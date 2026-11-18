import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Printer, RefreshCw, Mic } from "lucide-react";
import { useState as useRefreshState } from "react";
import { formatCairoDate } from "@/components/utils/timezoneHelper";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function OrderHistoryView({ orders, orderType, printers, clients, menuItems, currentUser, onPrint, onRefresh }) {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useRefreshState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  const filteredOrders = orders.filter(order => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const customer = clients.find(c => c.id === order.customer_id);
    return (
      order.customer_name?.toLowerCase().includes(q) ||
      customer?.phone?.toLowerCase().includes(q) ||
      order.customer_phone?.toLowerCase().includes(q)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {orderType === "dine_in" ? "Dine-In" : orderType === "delivery" ? "Delivery" : "Takeaway"} Orders
          </CardTitle>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by customer name or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredOrders.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No orders found</p>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => {
              const customer = clients.find(c => c.id === order.customer_id);
              return (
                <div key={order.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                        {order.voice_order_id && (
                          <Badge className="bg-purple-100 text-purple-700 border border-purple-300 text-[10px] gap-0.5 px-1.5 py-0">
                            <Mic className="w-2.5 h-2.5" />
                            Voice
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium">{order.customer_name}</p>
                      {customer?.phone && (
                        <p className="text-xs text-slate-500">{customer.phone}</p>
                      )}
                      <p className="text-xs text-slate-500">{formatCairoDate(order.created_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        order.status === "completed" ? "default" :
                        order.status === "cancelled" ? "destructive" : "secondary"
                      }>
                        {order.status}
                      </Badge>
                      {printers.some(p => p.is_enabled) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onPrint(order)}
                          className="h-7 gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          Print
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="text-sm space-y-2">
                    {order.items?.map((item, idx) => {
                      const itemTotal = (item.price || 0) * (item.quantity || 0) + ((item.option_price_modifier || 0) * (item.quantity || 0));
                      const displayName = item.name?.replace(/\n/g, ' - ') || item.name;
                      return (
                        <div key={idx} className="bg-slate-50 p-2 rounded">
                          <div className="flex justify-between text-slate-700">
                            <span className="font-medium">{item.quantity}x {displayName}</span>
                            <span className="font-semibold">{formatCurrency(itemTotal)}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{formatCurrency(item.price + (item.option_price_modifier || 0))} × {item.quantity}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1 border-t pt-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.subtotal || 0)}</span>
                    </div>
                    {(order.service_charge || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Service Charge</span>
                        <span>{formatCurrency(order.service_charge || 0)}</span>
                      </div>
                    )}
                    {(order.tax || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Tax</span>
                        <span>{formatCurrency(order.tax || 0)}</span>
                      </div>
                    )}
                    {(order.delivery_fee || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Delivery Fee</span>
                        <span>{formatCurrency(order.delivery_fee || 0)}</span>
                      </div>
                    )}
                    {(order.delivery_company_fee || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Company Fee</span>
                        <span>{formatCurrency(order.delivery_company_fee || 0)}</span>
                      </div>
                    )}
                    {(order.discount_amount || 0) > 0 && (
                      <div className="flex justify-between text-sm text-green-700">
                        <span>Discount</span>
                        <span>-{formatCurrency(order.discount_amount || 0)}</span>
                      </div>
                    )}
                    {(order.cashback_used || 0) > 0 && (
                      <div className="flex justify-between text-sm text-green-700">
                        <span>Cashback Used</span>
                        <span>-{formatCurrency(order.cashback_used || 0)}</span>
                      </div>
                    )}
                    {(order.minimum_charge_adjustment || 0) > 0 && (
                      <>
                        <div className="flex justify-between text-sm text-amber-800 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-300">
                          <span>Min Charge ({formatCurrency(order.minimum_charge_per_guest)} × {order.minimum_charge_guests} guests)</span>
                          <span>{formatCurrency(order.minimum_charge_total)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          <span>Min Charge Adjustment</span>
                          <span>+{formatCurrency(order.minimum_charge_adjustment)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(order.total || 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}