import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Phone, Clock, CheckCircle, Navigation } from "lucide-react";
import { toast } from "sonner";
import { formatCairoDate } from "@/components/utils/timezoneHelper";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function DeliveryDriverDashboard() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: deliveryPerson } = useQuery({
    queryKey: ["deliveryPerson", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const persons = await base44.entities.DeliveryPerson.filter({ email: currentUser.email });
      return persons[0] || null;
    },
    enabled: !!currentUser?.email
  });

  // Get only orders assigned to this driver
  const { data: myOrders = [] } = useQuery({
    queryKey: ["myDeliveryOrders", deliveryPerson?.id],
    queryFn: async () => {
      if (!deliveryPerson?.id) return [];
      const orders = await base44.entities.Order.filter({ 
        delivery_person_id: deliveryPerson.id,
        order_type: "delivery"
      });
      return orders.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!deliveryPerson?.id
  });

  const activeOrders = myOrders.filter(o => 
    o.status !== "completed" && o.status !== "cancelled"
  );

  const completedToday = myOrders.filter(o => {
    const orderDate = new Date(o.created_date);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString() && o.status === "completed";
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      return await base44.entities.Order.update(orderId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDeliveryOrders"] });
      toast.success("Order status updated");
    }
  });

  const statusConfig = {
    pending: { label: "Pending", color: "bg-warning-100 text-warning-800" },
    preparing: { label: "Preparing", color: "bg-blue-100 text-blue-800" },
    ready: { label: "Ready", color: "bg-green-100 text-green-800" },
    completed: { label: "Delivered", color: "bg-slate-100 text-slate-800" }
  };

  if (!deliveryPerson) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Not a Delivery Driver</h2>
            <p className="text-slate-600">Your account is not registered as a delivery driver.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Delivery Dashboard</h1>
          <p className="text-slate-600">Welcome, {deliveryPerson.name}</p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Package className="w-8 h-8 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{activeOrders.length}</p>
              <p className="text-sm text-slate-600">Active Deliveries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold">{completedToday.length}</p>
              <p className="text-sm text-slate-600">Completed Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="text-2xl font-bold">{myOrders.length}</p>
              <p className="text-sm text-slate-600">Total Orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Orders */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Active Deliveries</h2>
          {activeOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600">No active deliveries</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          {formatCairoDate(order.created_date)}
                        </p>
                      </div>
                      <Badge className={statusConfig[order.status]?.color}>
                        {statusConfig[order.status]?.label || order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer Info */}
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Customer
                      </h4>
                      <p className="font-medium">{order.customer_name}</p>
                    </div>

                    {/* Delivery Address */}
                    {order.delivery_address && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Delivery Address
                        </h4>
                        <p className="text-sm">{order.delivery_address.street}</p>
                        {order.delivery_address.building && (
                          <p className="text-sm">Building: {order.delivery_address.building}</p>
                        )}
                        {order.delivery_address.floor && (
                          <p className="text-sm">Floor: {order.delivery_address.floor}</p>
                        )}
                        {order.delivery_address.apartment && (
                          <p className="text-sm">Apartment: {order.delivery_address.apartment}</p>
                        )}
                        {order.delivery_address.phone && (
                          <a href={`tel:${order.delivery_address.phone}`} className="text-sm text-blue-600 font-medium">
                            📞 {order.delivery_address.phone}
                          </a>
                        )}
                        {order.delivery_address.location_url && (
                          <a 
                            href={order.delivery_address.location_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium flex items-center gap-1 mt-2"
                          >
                            <Navigation className="w-4 h-4" />
                            Open in Maps
                          </a>
                        )}
                      </div>
                    )}

                    {/* Zone Info */}
                    {order.delivery_zone_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">{order.delivery_zone_name}</Badge>
                        <span className="text-slate-600">
                          Fee: {formatCurrency(order.delivery_fee || 0)}
                        </span>
                      </div>
                    )}

                    {/* Items */}
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Order Items:</h4>
                      <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold text-base pt-2 mt-2 border-t">
                        <span>Total:</span>
                        <span>{formatCurrency(order.total)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      {order.status === "ready" && (
                        <Button
                          onClick={() => updateOrderMutation.mutate({ 
                            orderId: order.id, 
                            status: "completed" 
                          })}
                          disabled={updateOrderMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Delivered
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed Today */}
        {completedToday.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Completed Today</h2>
            <div className="space-y-3">
              {completedToday.map(order => (
                <Card key={order.id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-slate-600">{order.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(order.total)}</p>
                        <Badge className="bg-green-100 text-green-800 mt-1">Delivered</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}