import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { Truck, Bell, Settings, Package, CheckCircle2, Navigation, Users, BarChart3, UserCheck, Clock, Search, X } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import DeliveryOrderCard from "@/components/delivery/DeliveryOrderCard";
import DeliveryChat from "@/components/delivery/DeliveryChat";
import DeliveryCompanyPanel from "@/components/delivery/DeliveryCompanyPanel";
import DeliveryPerformanceDashboard from "@/components/delivery/DeliveryPerformanceDashboard";
import DeliveryDashboard from "@/components/delivery/DeliveryDashboard";
import DeliveryPartnerPerformance from "@/components/delivery/DeliveryPartnerPerformance";
import { useBranch } from "@/components/branches/BranchContext";

const STATUS_FILTERS = [
  { key: "active", label: "Active", statuses: ["pending", "acknowledged", "in_delivery"] },
  { key: "pending", label: "Pending", statuses: ["pending"] },
  { key: "acknowledged", label: "Acknowledged", statuses: ["acknowledged"] },
  { key: "in_delivery", label: "In Delivery", statuses: ["in_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
];

import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";

export default function DeliveryPortal() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("orders");
  const screenTabs = useScreenTabs("DeliveryPortal");
  const [statusFilter, setStatusFilter] = useState("active");
  const [myStatusFilter, setMyStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showCompanyPanel, setShowCompanyPanel] = useState(false);
  const [orders, setOrders] = useState([]);
  const knownOrderIds = useRef(new Set());
  const { selectedBranchId } = useBranch();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  // Fetch delivery persons
  const { data: deliveryPersons = [] } = useQuery({
    queryKey: ["deliveryPersons", selectedBranchId],
    queryFn: () => base44.entities.DeliveryPerson.filter({ status: ["active", "busy"], ...(!selectedBranchId ? {} : { branch_id: selectedBranchId }) }, "name", 100),
  });

  // Fetch delivery orders
  const { data: initialOrders = [] } = useQuery({
    queryKey: ["deliveryOrders", selectedBranchId],
    queryFn: () => base44.entities.Order.filter({ order_type: "delivery", ...(!selectedBranchId ? {} : { branch_id: selectedBranchId }) }, "-created_date", 100),
  });

  useEffect(() => {
    if (initialOrders.length > 0) {
      setOrders(initialOrders);
      knownOrderIds.current = new Set(initialOrders.map(o => o.id));
    }
  }, [initialOrders]);

  // Real-time subscription for order changes
  useEffect(() => {
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      const order = event.data;
      if (!order || order.order_type !== "delivery") return;

      if (event.type === "create") {
        if (selectedBranchId && order.branch_id && order.branch_id !== selectedBranchId) return;
        if (!knownOrderIds.current.has(order.id)) {
          knownOrderIds.current.add(order.id);
          setOrders(prev => [order, ...prev]);
          toast.success(`New delivery order received!`, {
            description: `${order.customer_name || "Customer"} — EGP ${(order.total || 0).toFixed(2)}`,
            duration: 6000,
          });
          try {
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (e) {}
        }
      } else if (event.type === "update") {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...order } : o));
      } else if (event.type === "delete") {
        setOrders(prev => prev.filter(o => o.id !== order.id));
        knownOrderIds.current.delete(order.id);
      }
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Find current delivery person profile (matched by email)
  const currentDeliveryPerson = useMemo(() => {
    if (!currentUser?.email || !deliveryPersons?.length) return null;
    return deliveryPersons.find(p => p.email?.toLowerCase() === currentUser.email?.toLowerCase()) || null;
  }, [currentUser, deliveryPersons]);

  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  // Dashboards follow "View analytics"; the companies panel follows the Settings tabs.
  const canSeeOverview = isAdmin || permissions?.analytics_view === true;
  const canManageCompanies = isAdmin || permissions?.admin_settings === true;
  const isDeliveryPerson = !!currentDeliveryPerson;
  // Tabs closed in Admin › Modules are left out; a closed tab falls back to the first open one.
  const shownTab = screenTabs.pick(activeTab, ["orders", ...(isDeliveryPerson ? ["my-deliveries"] : []), ...(canSeeOverview ? ["dashboard", "performance"] : []), "chat"]);

  // Stats
  const stats = useMemo(() => {
    const today = moment().format("YYYY-MM-DD");
    return {
      pending: orders.filter(o => (o.delivery_status || "pending") === "pending").length,
      acknowledged: orders.filter(o => o.delivery_status === "acknowledged").length,
      in_delivery: orders.filter(o => o.delivery_status === "in_delivery").length,
      delivered: orders.filter(o => o.delivery_status === "delivered").length,
      deliveredToday: orders.filter(o => o.delivery_status === "delivered" && o.delivery_delivered_at && moment(o.delivery_delivered_at).isSame(today, "day")).length,
    };
  }, [orders]);

  // Search helper — matches customer name, phone, order ID, or delivery person name
  const matchesSearch = (o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (o.customer_name || "").toLowerCase().includes(q) ||
      (o.customer_phone || "").toLowerCase().includes(q) ||
      (o.id || "").toLowerCase().includes(q) ||
      (o.delivery_person_name || "").toLowerCase().includes(q) ||
      (o.delivery_company_name || "").toLowerCase().includes(q)
    );
  };

  // Orders assigned to the current delivery person
  const myOrders = useMemo(() => {
    if (!currentDeliveryPerson) return [];
    return orders.filter(o => o.delivery_person_id === currentDeliveryPerson.id);
  }, [orders, currentDeliveryPerson]);

  // Filtered orders for the "All Orders" tab
  const filteredOrders = useMemo(() => {
    const filterConfig = STATUS_FILTERS.find(f => f.key === statusFilter);
    const statusFiltered = !filterConfig
      ? orders
      : orders.filter(o => filterConfig.statuses.includes(o.delivery_status || "pending"));
    return statusFiltered.filter(matchesSearch);
  }, [orders, statusFilter, searchQuery]);

  // Filtered orders for the "My Deliveries" tab (status filter + search)
  const filteredMyOrders = useMemo(() => {
    const filterConfig = STATUS_FILTERS.find(f => f.key === myStatusFilter);
    const statusFiltered = !filterConfig
      ? myOrders
      : myOrders.filter(o => filterConfig.statuses.includes(o.delivery_status || "pending"));
    return statusFiltered.filter(matchesSearch);
  }, [myOrders, myStatusFilter, searchQuery]);

  const selectedOrder = orders.find(o => o.id === selectedOrderId);
  const selectedOrderLabel = selectedOrder ? `#${selectedOrder.id?.slice(-6).toUpperCase()} — ${selectedOrder.customer_name || "Customer"}` : null;

  const handleStatusChange = async (order, newStatus) => {
    const now = new Date().toISOString();
    const updates = { delivery_status: newStatus };
    if (newStatus === "acknowledged") {
      updates.delivery_acknowledged_at = now;
      updates.delivery_acknowledged_by = currentUser?.full_name || currentUser?.email;
    }
    if (newStatus === "in_delivery") updates.delivery_picked_up_at = now;
    if (newStatus === "delivered") updates.delivery_delivered_at = now;

    try {
      await base44.entities.Order.update(order.id, updates);

      // Check for delivery bonus milestones when order is delivered
      if (newStatus === "delivered" && order.delivery_person_id) {
        try {
          // Bonus is calculated and recorded on the server from the tier setup
          // and the driver's actual delivered orders.
          const res = await base44.functions.invoke('awardDeliveryBonus', { order_id: order.id });
          for (const a of res.data?.awarded || []) {
            toast.success(`🏆 Bonus earned: ${a.bonus_amount} EGP (${a.tier_name})`);
          }
          queryClient.invalidateQueries({ queryKey: ["deliveryPersons"] });
          queryClient.invalidateQueries({ queryKey: ["deliveryBonusRecords"] });
        } catch (bonusErr) {
          console.error("Bonus milestone check failed:", bonusErr);
        }
      }

      await base44.entities.DeliveryMessage.create({
        order_id: order.id,
        order_label: `#${order.id?.slice(-6).toUpperCase()} — ${order.customer_name || "Customer"}`,
        sender_name: currentUser?.full_name || currentUser?.email,
        sender_email: currentUser?.email,
        message_text: `Status changed to "${newStatus.replace("_", " ")}"`,
        message_type: "status_update",
        status_value: newStatus,
        delivery_company_name: order.delivery_company_name,
      });
      toast.success(`Order marked as ${newStatus.replace("_", " ")}`);
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    } catch (e) {
      toast.error("Failed to update delivery status");
    }
  };

  const handleAssign = async (order, personId) => {
    const person = deliveryPersons?.find(p => p.id === personId);
    if (!person) return;
    try {
      await base44.entities.Order.update(order.id, {
        delivery_person_id: personId,
        delivery_person_name: person.name,
      });
      await base44.entities.DeliveryMessage.create({
        order_id: order.id,
        order_label: `#${order.id?.slice(-6).toUpperCase()} — ${order.customer_name || "Customer"}`,
        sender_name: currentUser?.full_name || currentUser?.email,
        sender_email: currentUser?.email,
        message_text: `Order assigned to ${person.name}`,
        message_type: "status_update",
        delivery_company_name: order.delivery_company_name,
      });
      toast.success(`Order assigned to ${person.name}`);
      queryClient.invalidateQueries({ queryKey: ["deliveryOrders"] });
    } catch (e) {
      toast.error("Failed to assign delivery person");
    }
  };

  const handleSelfAssign = async (order) => {
    if (!currentDeliveryPerson) {
      toast.error("Your account is not linked to a delivery person profile");
      return;
    }
    await handleAssign(order, currentDeliveryPerson.id);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Delivery Management</h1>
                <p className="text-xs text-slate-500">
                  {canSeeOverview ? "Overview — all delivery orders" : isDeliveryPerson ? `Your deliveries — ${currentDeliveryPerson.name}` : "Real-time order tracking"}
                </p>
              </div>
            </div>
            {canManageCompanies && (
              <Button variant="outline" size="sm" onClick={() => setShowCompanyPanel(!showCompanyPanel)}>
                <Settings className="w-4 h-4 mr-1" />Companies
              </Button>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            <StatChip icon={<Bell className="w-3.5 h-3.5" />} label="Pending" value={stats.pending} color="amber" />
            <StatChip icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Acknowledged" value={stats.acknowledged} color="blue" />
            <StatChip icon={<Navigation className="w-3.5 h-3.5" />} label="In Delivery" value={stats.in_delivery} color="purple" />
            <StatChip icon={<Truck className="w-3.5 h-3.5" />} label="Delivered Today" value={stats.deliveredToday} color="green" />
          </div>
        </div>
      </div>

      {/* Company Panel (collapsible) */}
      {showCompanyPanel && canManageCompanies && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <DeliveryCompanyPanel onClose={() => setShowCompanyPanel(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left/Center Panel */}
          <div className="lg:col-span-2">
            {!shownTab ? <ClosedTabsNotice /> : (
            <Tabs value={shownTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <TabsList>
                  {screenTabs.isOpen("orders") && <TabsTrigger value="orders">All Orders ({orders.length})</TabsTrigger>}
                  {isDeliveryPerson && screenTabs.isOpen("my-deliveries") && (
                    <TabsTrigger value="my-deliveries">
                      <UserCheck className="w-4 h-4 mr-1" />My Deliveries ({myOrders.length})
                    </TabsTrigger>
                  )}
                  {canSeeOverview && (
                    <>
                      {screenTabs.isOpen("dashboard") && (
                      <TabsTrigger value="dashboard">
                        <BarChart3 className="w-4 h-4 mr-1" />Dashboard
                      </TabsTrigger>
                      )}
                      {screenTabs.isOpen("performance") && (
                      <TabsTrigger value="performance">
                        <Clock className="w-4 h-4 mr-1" />Performance
                      </TabsTrigger>
                      )}
                    </>
                  )}
                  {screenTabs.isOpen("chat") && (
                  <TabsTrigger value="chat">
                    <Users className="w-4 h-4 mr-1" />Chat
                  </TabsTrigger>
                  )}
                </TabsList>
              </div>

              {/* All Orders Tab */}
              <TabsContent value="orders">
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by customer, phone, order ID, driver..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                  {STATUS_FILTERS.map(f => {
                    const count = f.key === "active"
                      ? orders.filter(o => f.statuses.includes(o.delivery_status || "pending")).length
                      : orders.filter(o => (o.delivery_status || "pending") === f.statuses[0]).length;
                    return (
                      <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          statusFilter === f.key
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {f.label} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredOrders.length === 0 ? (
                    <EmptyState label={searchQuery ? "matching" : (statusFilter === "active" ? "active" : statusFilter)} />
                  ) : (
                    filteredOrders.map(order => (
                      <DeliveryOrderCard
                        key={order.id}
                        order={order}
                        deliveryPersons={deliveryPersons}
                        currentUser={currentUser}
                        selected={selectedOrderId === order.id}
                        onSelect={(o) => { setSelectedOrderId(o.id); setActiveTab("chat"); }}
                        onStatusChange={handleStatusChange}
                        onAssign={handleAssign}
                        onSelfAssign={isDeliveryPerson ? handleSelfAssign : undefined}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              {/* My Deliveries Tab */}
              {isDeliveryPerson && (
                <TabsContent value="my-deliveries">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-800">
                    <span className="font-medium">{myOrders.filter(o => o.delivery_status !== "delivered").length}</span> active deliveries assigned to you.
                    {!isAdmin && (
                      <span className="ml-2 text-amber-600">You can also self-assign from "All Orders".</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search your deliveries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                    {STATUS_FILTERS.map(f => {
                      const count = f.key === "active"
                        ? myOrders.filter(o => f.statuses.includes(o.delivery_status || "pending")).length
                        : myOrders.filter(o => (o.delivery_status || "pending") === f.statuses[0]).length;
                      return (
                        <button
                          key={f.key}
                          onClick={() => setMyStatusFilter(f.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                            myStatusFilter === f.key
                              ? "bg-slate-900 text-white"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {f.label} ({count})
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredMyOrders.length === 0 ? (
                      <EmptyState label={searchQuery ? "matching" : "assigned to you"} />
                    ) : (
                      filteredMyOrders.map(order => (
                        <DeliveryOrderCard
                          key={order.id}
                          order={order}
                          deliveryPersons={deliveryPersons}
                          currentUser={currentUser}
                          selected={selectedOrderId === order.id}
                          onSelect={(o) => { setSelectedOrderId(o.id); setActiveTab("chat"); }}
                          onStatusChange={handleStatusChange}
                          onAssign={handleAssign}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              )}

              {/* Delivery Dashboard Tab */}
              {canSeeOverview && (
                <TabsContent value="dashboard">
                  <div className="mb-2">
                    <h2 className="text-lg font-semibold text-slate-900">Delivery Dashboard</h2>
                    <p className="text-xs text-slate-500">Today's delivery overview and per-driver performance</p>
                  </div>
                  <DeliveryDashboard orders={orders} deliveryPersons={deliveryPersons} />
                </TabsContent>
              )}

              {/* Performance Dashboard Tab */}
              {canSeeOverview && (
                <TabsContent value="performance">
                  <div className="mb-2">
                    <h2 className="text-lg font-semibold text-slate-900">Delivery Performance</h2>
                    <p className="text-xs text-slate-500">Time analysis across all delivery lifecycle stages</p>
                  </div>
                  <DeliveryPerformanceDashboard orders={orders} />

                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <h3 className="text-base font-semibold text-slate-900 mb-1">Per-Partner Breakdown</h3>
                    <p className="text-xs text-slate-500 mb-3">Average time from order → kitchen ready → final delivery, per delivery partner. Identifies where bottlenecks occur.</p>
                    <DeliveryPartnerPerformance orders={orders} />
                  </div>
                </TabsContent>
              )}

              {/* Chat Tab (mobile/tablet) */}
              <TabsContent value="chat">
                <div className="bg-white rounded-lg border border-slate-200 h-[600px]">
                  {selectedOrderId ? (
                    <DeliveryChat orderId={selectedOrderId} orderLabel={selectedOrderLabel} currentUser={currentUser} />
                  ) : (
                    <DeliveryChat orderId={null} orderLabel={null} currentUser={currentUser} />
                  )}
                </div>
              </TabsContent>
            </Tabs>
            )}
          </div>

          {/* Right Side: General/Order Chat (desktop) */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-lg border border-slate-200 h-[600px] sticky top-32">
              {selectedOrderId ? (
                <>
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
                    <span className="text-sm font-medium text-slate-700 truncate">{selectedOrderLabel}</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrderId(null)}>
                      General Chat
                    </Button>
                  </div>
                  <div className="h-[calc(100%-41px)]">
                    <DeliveryChat orderId={selectedOrderId} orderLabel={selectedOrderLabel} currentUser={currentUser} />
                  </div>
                </>
              ) : (
                <DeliveryChat orderId={null} orderLabel={null} currentUser={currentUser} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, color }) {
  const colors = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    green: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${colors[color]} whitespace-nowrap`}>
      {icon}
      <span className="text-xs font-medium">{label}:</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="col-span-full text-center py-12 text-slate-400">
      <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
      <p className="text-sm">No {label} deliveries</p>
    </div>
  );
}