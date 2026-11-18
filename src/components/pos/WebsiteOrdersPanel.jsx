import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check } from "lucide-react";
import { formatCairoDate } from "@/components/utils/timezoneHelper";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function WebsiteOrdersPanel({ websiteOrders, deliveryCompanies, onLoadOrder }) {
  if (!websiteOrders.length) return null;

  return (
    <Card className="mb-6 border-2 border-amber-500 shadow-lg">
      <CardHeader className="bg-amber-50">
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <AlertCircle className="w-5 h-5" />
          Website Orders Awaiting Review ({websiteOrders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {websiteOrders.map(order => (
            <Card key={order.id} className="border-2 border-amber-300 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-700">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="font-bold text-lg">{order.customer_name}</p>
                    <p className="text-sm text-slate-600">{order.customer_phone}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatCairoDate(order.created_date)}</p>
                  </div>
                  <Badge className="bg-amber-600 text-white">WEBSITE ORDER</Badge>
                </div>

                {order.delivery_address && (
                  <div className="mb-3 p-3 bg-white border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-slate-700 mb-1">📍 Delivery Address:</p>
                    <p className="text-sm font-medium">{order.delivery_address.name}</p>
                    <p className="text-sm text-slate-600">
                      {order.delivery_address.street}, {order.delivery_address.area}, {order.delivery_address.city}
                    </p>
                    {order.delivery_address.building && (
                      <p className="text-xs text-slate-500">
                        Building {order.delivery_address.building}
                        {order.delivery_address.floor && `, Floor ${order.delivery_address.floor}`}
                        {order.delivery_address.apartment && `, Apt ${order.delivery_address.apartment}`}
                      </p>
                    )}
                    {order.delivery_address.phone && (
                      <p className="text-sm text-slate-600 mt-1">☎️ {order.delivery_address.phone}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2 mb-3">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="bg-white p-2 rounded border">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm">{item.quantity}x {item.name}</span>
                        <span className="font-semibold">{formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 bg-white p-3 rounded border">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(order.subtotal || 0)}</span>
                  </div>
                  {(order.tax || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>{formatCurrency(order.tax || 0)}</span>
                    </div>
                  )}
                  {(order.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Discount:</span>
                      <span>-{formatCurrency(order.discount_amount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-1">
                    <span>Total:</span>
                    <span>{formatCurrency(order.total || 0)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Payment: {order.payment_method}</p>
                </div>

                {order.notes && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs font-semibold text-blue-900">Customer Notes:</p>
                    <p className="text-sm text-blue-800">{order.notes.replace("[Website Order - Awaiting Cashier Review]", "").trim()}</p>
                  </div>
                )}

                <Button
                  className="w-full mt-3 bg-amber-600 hover:bg-amber-700"
                  onClick={() => onLoadOrder(order)}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Review & Process Order
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}