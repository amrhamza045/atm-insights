import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Package, ChevronDown, Calendar, PoundSterling, ShoppingBag, RotateCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePullToRefresh } from "@/components/hooks/usePullToRefresh";
import RestaurantLogo from "@/components/RestaurantLogo";
import { Printer } from "lucide-react";
import { printReceipt } from "@/components/pos/ReceiptPrinter";

export default function OrderHistory() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("-created_date");
  const [uploadingReceipt, setUploadingReceipt] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Orders refreshed!");
    } finally {
      setIsRefreshing(false);
    }
  };

  usePullToRefresh(handleRefresh, true);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: client } = useQuery({
    queryKey: ["client", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const clients = await base44.entities.Client.filter({ email: currentUser.email });
      return clients[0] || null;
    },
    enabled: !!currentUser?.email
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return await base44.entities.Order.filter({ customer_id: client.id }, sortBy);
    },
    enabled: !!client?.id
  });

  // Real-time order updates
  useEffect(() => {
    if (!client?.id) return;

    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (event.data?.customer_id === client.id) {
        queryClient.invalidateQueries({ queryKey: ["orders", client.id] });
        
        // Show toast notification for status updates
        if (event.type === "update") {
          toast.success(`Order #${event.id.slice(0, 8)} is now ${event.data.status}`);
        }
      }
    });

    return unsubscribe;
  }, [client?.id, queryClient]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [orders, statusFilter]);

  const statusConfig = {
    pending: { label: "Pending", color: "bg-warning-100 text-warning-800" },
    preparing: { label: "Preparing", color: "bg-blue-100 text-blue-800" },
    ready: { label: "Ready", color: "bg-green-100 text-green-800" },
    completed: { label: "Completed", color: "bg-slate-100 text-slate-800" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" }
  };

  const handlePrintOrder = async (order) => {
    try {
      // Create a minimal printer settings object for browser printing
      const printerSettings = {
        is_enabled: true,
        use_printnode: false,
        receipt_width: 80,
        font_size: 12,
        font_name: "Consolas"
      };
      await printReceipt(order, printerSettings, currentUser?.full_name || "Customer", "cashier", client);
      toast.success("Receipt opened for printing");
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to open receipt for printing");
    }
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    completed: orders.filter(o => o.status === "completed").length,
    totalSpent: orders.reduce((sum, o) => sum + (o.total || 0), 0)
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">Loading orders...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900">Not Registered</h3>
          <p className="text-sm text-slate-500 mt-1">Please complete registration to view orders</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 safe-area-inset-top safe-area-inset-bottom">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <RestaurantLogo className="h-10 mb-3" />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Order History</h1>
              <p className="text-slate-600">Track and review your past orders</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="text-sm text-slate-600">Total Orders</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-slate-600">Pending</p>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm text-slate-600">Completed</p>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <PoundSterling className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="text-sm text-slate-600">Total Spent</p>
                    <p className="text-2xl font-bold">{stats.totalSpent.toFixed(2)} EGP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created_date">Newest First</SelectItem>
                    <SelectItem value="created_date">Oldest First</SelectItem>
                    <SelectItem value="-total">Highest Amount</SelectItem>
                    <SelectItem value="total">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={isRefreshing}
                  className="w-full sm:w-auto"
                >
                  <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-900">No orders found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {statusFilter !== "all" ? "Try changing your filters" : "Start ordering from our menu!"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => (
              <Collapsible 
                key={order.id}
                open={expandedOrders[order.id] ?? index < 3}
                onOpenChange={(open) => setExpandedOrders({...expandedOrders, [order.id]: open})}
              >
                <Card>
                  <CollapsibleTrigger asChild className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                          <div className="text-left">
                            <CardTitle className="text-lg">
                              Order #{order.id.slice(0, 8)}
                            </CardTitle>
                            <p className="text-sm text-slate-500 font-normal">
                              {format(new Date(order.created_date), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-4">
                            <p className="text-lg font-bold">{(order.total || 0).toFixed(2)} EGP</p>
                            <p className="text-xs text-slate-500">
                              {order.items?.length || 0} items
                            </p>
                          </div>
                          <Badge className={statusConfig[order.status]?.color || "bg-slate-100"}>
                            {statusConfig[order.status]?.label || order.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintOrder(order);
                            }}
                            className="ml-2"
                            title="Print receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="border-t">
                      <div className="space-y-3 pt-4">
                        {/* Order Items */}
                        <div>
                          <h4 className="font-semibold mb-2">Items:</h4>
                          <div className="space-y-2">
                            {order.items?.map((item, idx) => {
                               const baseTotal = (item.price || 0) * (item.quantity || 0);
                               const optionTotal = (item.option_price_modifier || 0) * (item.quantity || 0);
                               const itemTotal = baseTotal + optionTotal;

                               return (
                                 <div key={idx} className="flex justify-between items-start p-2 bg-slate-50 rounded">
                                   <div className="flex-1">
                                     <p className="font-medium">{item.name}</p>
                                     <p className="text-sm text-slate-600">
                                       {item.price?.toFixed(2)} EGP × {item.quantity}
                                     </p>
                                     {item.size && (
                                       <p className="text-xs text-slate-500 mt-1">Size: {item.size}</p>
                                     )}
                                     {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                                       <div className="mt-2 space-y-1 border-t pt-2">
                                         <p className="text-xs font-semibold text-slate-700 mb-1">Options:</p>
                                         {Object.entries(item.selected_options).map(([optId, choices], optIdx) => {
                                           const optionModifierData = item.optionsWithModifiers?.[optId];
                                           const optionModifier = optionModifierData?.totalModifier || 0;
                                           const choiceText = Array.isArray(choices) ? choices.join(", ") : choices;
                                           return (
                                             <div key={optIdx} className="text-xs text-slate-600 flex justify-between">
                                               <span>• {choiceText}</span>
                                               {optionModifier > 0 && <span className="text-green-700 font-medium">+{optionModifier.toFixed(2)}</span>}
                                             </div>
                                           );
                                         })}
                                       </div>
                                     )}
                                     {item.optionsList && item.optionsList.length > 0 && (
                                       <div className="mt-2 space-y-1">
                                         {item.optionsList.map((opt, optIdx) => (
                                           <p key={optIdx} className="text-xs text-slate-500">• {opt}</p>
                                         ))}
                                       </div>
                                     )}
                                   </div>
                                   <div className="text-right ml-4">
                                     <p className="font-semibold">
                                       {itemTotal.toFixed(2)} EGP
                                     </p>
                                     {optionTotal > 0 && (
                                       <p className="text-xs text-green-700">
                                         (Base: {baseTotal.toFixed(2)}, Options: +{optionTotal.toFixed(2)})
                                       </p>
                                     )}
                                   </div>
                                 </div>
                               );
                             })}
                          </div>
                        </div>

                        {/* Order Summary */}
                        <div className="border-t pt-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Subtotal:</span>
                            <span>{(order.subtotal || 0).toFixed(2)} EGP</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Service Charge:</span>
                            <span>{(order.service_charge || 0).toFixed(2)} EGP</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Tax:</span>
                            <span>{(order.tax || 0).toFixed(2)} EGP</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Delivery Fee:</span>
                            <span>{(order.delivery_fee || 0).toFixed(2)} EGP</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Discount:</span>
                            <span>{(order.discount_amount || 0).toFixed(2)} EGP</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total:</span>
                            <span>{(order.total || 0).toFixed(2)} EGP</span>
                          </div>
                        </div>

                        {/* Delivery Address */}
                        {order.delivery_address && (
                          <div className="border-t pt-3">
                            <h4 className="font-semibold text-sm mb-2">Delivery Address:</h4>
                            <div className="bg-slate-50 p-3 rounded text-sm space-y-1">
                              <p className="font-medium">{order.delivery_address.name}</p>
                              <p>{order.delivery_address.street}</p>
                              {order.delivery_address.area && <p>Area: {order.delivery_address.area}</p>}
                              {order.delivery_address.city && <p>City: {order.delivery_address.city}</p>}
                            </div>
                          </div>
                        )}

                        {/* Payment Method & Notes */}
                        <div className="border-t pt-3 space-y-2">
                          {order.payment_method && (
                            <div className="space-y-2">
                              <p className="text-sm">
                                <span className="text-slate-600">Payment:</span>{" "}
                                <span className="font-medium capitalize">
                                  {order.payment_method === "cashback_balance" ? "Paid with Cashback" : order.payment_method}
                                </span>
                              </p>
                              {order.payment_method === "cashback_balance" && order.cashback_used > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
                                  <p className="font-semibold text-green-900">Cashback Payment Details:</p>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                      <span className="text-green-700">Previous Balance:</span>
                                      <p className="font-bold text-green-900">{((client?.cashback_earned || 0) + order.cashback_used).toFixed(2)} EGP</p>
                                    </div>
                                    <div>
                                      <span className="text-green-700">Deducted:</span>
                                      <p className="font-bold text-red-600">-{order.cashback_used.toFixed(2)} EGP</p>
                                    </div>
                                    <div>
                                      <span className="text-green-700">Current Balance:</span>
                                      <p className="font-bold text-green-900">{(client?.cashback_earned || 0).toFixed(2)} EGP</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {order.notes && (
                            <div>
                              <p className="text-sm text-slate-600 mb-1">Order Notes:</p>
                              <p className="text-sm bg-slate-50 p-2 rounded">{order.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}