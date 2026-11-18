import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import SupplierAccountPanel from '@/components/purchasing/supplierAccounts/SupplierAccountPanel';

const SUPPLIER_TABS = ["orders", "items", "info", "reviews"];
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Edit, Trash2, Star, Package, PoundSterling, TrendingUp,
  Phone, Mail, MapPin, User, ArrowLeft, ShoppingCart, AlertCircle, CheckCircle2, Clock, Truck, Link2
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import { useHasPermission } from "@/components/permissions/PermissionsContext";
import SupplierPayDialog from "@/components/purchasing/SupplierPayDialog";
import { useSupplierTotals, useSupplierPaymentHistory } from "@/components/purchasing/useSupplierPayments";
import { SupplierBalanceStrip, SupplierBalanceCards, SupplierPaymentsList } from "@/components/purchasing/SupplierPaymentSummary";

const STATUS_COLORS = {
  pending_approval: "bg-warning-100 text-warning-700",
  pending: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_ICONS = {
  pending_approval: Clock,
  pending: Clock,
  confirmed: CheckCircle2,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: AlertCircle,
};

export default function SupplierHub() {
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [payingSupplier, setPayingSupplier] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningItemId, setAssigningItemId] = useState(null);
  const [activeTab, setActiveTab] = useState("orders");
  // Tabs closed in Admin › Modules are left out; a closed tab falls back to the first open one.
  const screenTabs = useScreenTabs("SupplierHub");
  const shownTab = screenTabs.pick(activeTab, SUPPLIER_TABS);
  const openTabCount = SUPPLIER_TABS.filter(screenTabs.isOpen).length;

  const [formData, setFormData] = useState({
    name: "", contact_person: "", email: "", phone: "",
    address: "", payment_terms: "", notes: ""
  });
  const [reviewData, setReviewData] = useState({ delivery_rating: 5, quality_rating: 5, comments: "" });

  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const canPaySupplier = useHasPermission("supplier_payment_record");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date")
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.PurchaseOrder.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        500
      );
      return all.filter(po => !selectedBranchId || po.branch_id === selectedBranchId);
    }
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItems", selectedBranchId],
    queryFn: async () => {
      const items = await base44.entities.InventoryItem.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        1000
      );
      return items.filter(i => !selectedBranchId || i.branch_id === selectedBranchId);
    }
  });

  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ["purchaseInvoices", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.PurchaseInvoice.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        1000
      );
      return all.filter(
        inv =>
          inv.branch_id &&
          inv.status !== "draft" &&
          (!selectedBranchId || inv.branch_id === selectedBranchId)
      );
    }
  });

  const { totalsFor } = useSupplierTotals(selectedBranchId);
  const { payments: supplierPayments } = useSupplierPaymentHistory(selectedBranchId, selectedSupplier?.id);
  const getSupplierSpent = (supplierId) => totalsFor(supplierId).spent;
  const getSupplierPaid = (supplierId) => totalsFor(supplierId).paid;
  const getSupplierRemaining = (supplierId) => totalsFor(supplierId).remaining;

  const { data: reviews = [] } = useQuery({
    queryKey: ["supplierReviews", selectedSupplier?.id],
    queryFn: () => base44.entities.SupplierReview.filter({ supplier_id: selectedSupplier.id }),
    enabled: !!selectedSupplier
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Supplier created"); closeForm(); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Supplier updated"); closeForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier deleted");
      if (selectedSupplier) setSelectedSupplier(null);
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inventoryItems"] }); toast.success("Item updated"); setShowAssignDialog(false); }
  });

  const reviewMutation = useMutation({
    mutationFn: async (data) => {
      const overall = (data.delivery_rating + data.quality_rating) / 2;
      await base44.entities.SupplierReview.create({ ...data, overall_rating: overall, reviewed_by: (await base44.auth.me()).email });
      const allReviews = await base44.entities.SupplierReview.filter({ supplier_id: data.supplier_id });
      const avgDelivery = allReviews.reduce((s, r) => s + r.delivery_rating, 0) / allReviews.length;
      const avgQuality = allReviews.reduce((s, r) => s + r.quality_rating, 0) / allReviews.length;
      const avgOverall = allReviews.reduce((s, r) => s + r.overall_rating, 0) / allReviews.length;
      await base44.entities.Supplier.update(data.supplier_id, { delivery_performance: avgDelivery, quality_rating: avgQuality, rating: avgOverall });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplierReviews"] });
      toast.success("Review submitted");
      setShowReviewDialog(false);
    }
  });

  // Helpers
  const openForm = (supplier = null) => {
    setEditingSupplier(supplier);
    setFormData(supplier ? {
      name: supplier.name || "", contact_person: supplier.contact_person || "",
      email: supplier.email || "", phone: supplier.phone || "",
      address: supplier.address || "", payment_terms: supplier.payment_terms || "",
      notes: supplier.notes || ""
    } : { name: "", contact_person: "", email: "", phone: "", address: "", payment_terms: "", notes: "" });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingSupplier(null); };

  const handleSave = () => {
    if (!formData.name) { toast.error("Supplier name is required"); return; }
    editingSupplier
      ? updateMutation.mutate({ id: editingSupplier.id, data: formData })
      : createMutation.mutate(formData);
  };

  const handleSubmitReview = () => {
    const order = purchaseOrders.find(o => o.id === reviewOrderId);
    if (!order?.supplier_id) { toast.error("Cannot find supplier"); return; }
    reviewMutation.mutate({ supplier_id: order.supplier_id, supplier_name: order.supplier, purchase_order_id: order.id, ...reviewData });
  };

  const getRatingColor = (r) => r >= 4.5 ? "text-green-600" : r >= 3.5 ? "text-blue-600" : r >= 2.5 ? "text-warning-600" : "text-red-600";

  // Derived data for selected supplier
  const supplierOrders = selectedSupplier ? purchaseOrders.filter(o => o.supplier_id === selectedSupplier.id) : [];
  const supplierItems = selectedSupplier ? inventoryItems.filter(i => i.supplier_id === selectedSupplier.id) : [];
  const pendingOrders = supplierOrders.filter(o => ["pending_approval", "pending", "confirmed", "shipped"].includes(o.status));
  const unassignedItems = inventoryItems.filter(i => !i.supplier_id);

  // Summary stats for list view
  const totalPending = purchaseOrders.filter(o => ["pending_approval", "pending", "confirmed", "shipped"].includes(o.status)).length;

  // --- DETAIL VIEW ---
  if (selectedSupplier) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSupplier(null)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{selectedSupplier.name}</h1>
              {selectedSupplier.rating > 0 && (
                <span className={`flex items-center gap-1 text-sm font-semibold ${getRatingColor(selectedSupplier.rating)}`}>
                  <Star className="w-4 h-4 fill-current" />{selectedSupplier.rating.toFixed(1)}
                </span>
              )}
              <Badge variant={selectedSupplier.is_active ? "default" : "secondary"}>
                {selectedSupplier.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {selectedSupplier.contact_person && (
              <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1">
                <User className="w-3 h-3" />{selectedSupplier.contact_person}
                {selectedSupplier.phone && <><Phone className="w-3 h-3 ml-2" />{selectedSupplier.phone}</>}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openForm(selectedSupplier)}><Edit className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => { if (confirm("Delete this supplier?")) deleteMutation.mutate(selectedSupplier.id); }}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        <SupplierBalanceCards
          totalSpent={getSupplierSpent(selectedSupplier.id)}
          totalPaid={getSupplierPaid(selectedSupplier.id)}
          remaining={getSupplierRemaining(selectedSupplier.id)}
          canPay={canPaySupplier}
          onPay={() => setPayingSupplier(selectedSupplier)}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Orders", value: supplierOrders.length, icon: Package, color: "text-blue-500" },
            { label: "Pending Orders", value: pendingOrders.length, icon: Clock, color: "text-amber-500" },
            { label: "Linked Items", value: supplierItems.length, icon: Link2, color: "text-indigo-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
                <p className="text-xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Recorded Payments</h3>
          <SupplierPaymentsList payments={supplierPayments} />
        </div>

        <SupplierAccountPanel supplierId={selectedSupplier.id} />
        <SupplierPayDialog
          open={!!payingSupplier}
          onOpenChange={(open) => {
            if (!open) setPayingSupplier(null);
          }}
          supplier={payingSupplier}
          branchId={selectedBranchId}
          branchName={selectedBranch?.name}
          totalSpent={payingSupplier ? getSupplierSpent(payingSupplier.id) : 0}
          totalPaid={payingSupplier ? getSupplierPaid(payingSupplier.id) : 0}
          remaining={payingSupplier ? getSupplierRemaining(payingSupplier.id) : 0}
        />

        {/* Tabs */}
        {!shownTab ? <ClosedTabsNotice /> : (
        <Tabs value={shownTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${openTabCount}, minmax(0, 1fr))` }}>
            {screenTabs.isOpen("orders") && <TabsTrigger value="orders">Orders ({supplierOrders.length})</TabsTrigger>}
            {screenTabs.isOpen("items") && <TabsTrigger value="items">Items ({supplierItems.length})</TabsTrigger>}
            {screenTabs.isOpen("info") && <TabsTrigger value="info">Info</TabsTrigger>}
            {screenTabs.isOpen("reviews") && <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>}
          </TabsList>

          {/* Orders tab */}
          <TabsContent value="orders" className="space-y-3 mt-4">
            {supplierOrders.length === 0 ? (
              <Card className="p-10 text-center text-slate-500">No purchase orders from this supplier yet.</Card>
            ) : (
              supplierOrders.map(order => {
                const StatusIcon = STATUS_ICONS[order.status] || Clock;
                return (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{order.order_number}</h4>
                          <p className="text-sm text-slate-500">{order.inventory_category_name}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${STATUS_COLORS[order.status] || "bg-slate-100 text-slate-700"}`}>
                          <StatusIcon className="w-3 h-3" />
                          {order.status?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div><p className="text-slate-500 text-xs">Order Date</p><p className="font-medium">{order.order_date ? new Date(order.order_date).toLocaleDateString() : "—"}</p></div>
                        <div><p className="text-slate-500 text-xs">Items</p><p className="font-medium">{order.items?.length || 0}</p></div>
                        <div><p className="text-slate-500 text-xs">Total</p><p className="font-medium">{formatCurrency(order.total_amount)}</p></div>
                      </div>
                      {order.expected_delivery_date && (
                        <p className="text-xs text-slate-500 mt-2">Expected delivery: {new Date(order.expected_delivery_date).toLocaleDateString()}</p>
                      )}
                      {order.status === "delivered" && (
                        <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => { setReviewOrderId(order.id); setShowReviewDialog(true); }}>
                          <Star className="w-3 h-3" /> Rate This Order
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Items tab */}
          <TabsContent value="items" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-slate-500">{supplierItems.length} inventory item(s) linked to this supplier</p>
              {unassignedItems.length > 0 && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAssignDialog(true)}>
                  <Link2 className="w-3 h-3" /> Assign Item
                </Button>
              )}
            </div>
            {supplierItems.length === 0 ? (
              <Card className="p-10 text-center text-slate-500">
                No inventory items linked.
                {unassignedItems.length > 0 && (
                  <div className="mt-3">
                    <Button size="sm" onClick={() => setShowAssignDialog(true)} className="gap-1">
                      <Link2 className="w-3 h-3" /> Assign Items
                    </Button>
                  </div>
                )}
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {supplierItems.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-4 flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-slate-500">{item.category_name}</p>
                        <div className="flex gap-3 mt-2 text-sm">
                          <span className="text-slate-600">Stock: <strong>{item.quantity}</strong> {item.selling_unit_label || item.unit}</span>
                          {item.cost_per_unit > 0 && <span className="text-slate-600">Cost: <strong>{formatCurrency(item.cost_per_unit)}</strong></span>}
                        </div>
                        {item.quantity <= (item.low_stock_threshold || 10) && (
                          <Badge className="mt-2 bg-red-100 text-red-700 text-xs">Low Stock</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Unlink from supplier"
                        onClick={() => updateItemMutation.mutate({ id: item.id, data: { supplier_id: "", supplier: "" } })}
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Info tab */}
          <TabsContent value="info" className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Email", value: selectedSupplier.email, icon: Mail },
                { label: "Phone", value: selectedSupplier.phone, icon: Phone },
                { label: "Address", value: selectedSupplier.address, icon: MapPin },
                { label: "Payment Terms", value: selectedSupplier.payment_terms, icon: PoundSterling },
              ].filter(f => f.value).map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
                  <p className="font-medium text-sm">{value}</p>
                </div>
              ))}
            </div>
            {selectedSupplier.notes && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <p className="text-sm bg-slate-50 p-3 rounded">{selectedSupplier.notes}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
              <div><p className="text-slate-500 text-xs">Delivery Performance</p><p className="font-semibold">{selectedSupplier.delivery_performance > 0 ? selectedSupplier.delivery_performance.toFixed(1) : "—"} / 5</p></div>
              <div><p className="text-slate-500 text-xs">Quality Rating</p><p className="font-semibold">{selectedSupplier.quality_rating > 0 ? selectedSupplier.quality_rating.toFixed(1) : "—"} / 5</p></div>
            </div>
          </TabsContent>

          {/* Reviews tab */}
          <TabsContent value="reviews" className="mt-4 space-y-3">
            {reviews.length === 0 ? (
              <Card className="p-10 text-center text-slate-500">No reviews yet. Rate a delivered order to get started.</Card>
            ) : (
              reviews.map(review => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-current text-amber-500" />
                        <span className="font-bold">{review.overall_rating?.toFixed(1)}</span>
                        <span className="text-xs text-slate-500">{new Date(review.created_date).toLocaleDateString()}</span>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>Delivery: {review.delivery_rating}/5</p>
                        <p>Quality: {review.quality_rating}/5</p>
                      </div>
                    </div>
                    {review.comments && <p className="text-sm bg-slate-50 p-3 rounded">{review.comments}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
        )}

        {/* Assign Item Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Inventory Item to {selectedSupplier.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Select an unassigned inventory item to link to this supplier.</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unassignedItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.category_name}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => updateItemMutation.mutate({ id: item.id, data: { supplier_id: selectedSupplier.id, supplier: selectedSupplier.name } })}
                    >
                      Assign
                    </Button>
                  </div>
                ))}
                {unassignedItems.length === 0 && <p className="text-center text-slate-500 py-4">All items are already assigned to suppliers.</p>}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setShowAssignDialog(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rate Supplier Performance</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {["delivery", "quality"].map(type => (
                <div key={type}>
                  <Label>{type === "delivery" ? "Delivery Performance" : "Product Quality"}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-6 h-6 cursor-pointer ${star <= reviewData[`${type}_rating`] ? "fill-current text-amber-500" : "text-slate-300"}`}
                        onClick={() => setReviewData({ ...reviewData, [`${type}_rating`]: star })}
                      />
                    ))}
                    <span className="ml-1 font-medium text-sm">{reviewData[`${type}_rating`]}/5</span>
                  </div>
                </div>
              ))}
              <div>
                <Label>Comments (Optional)</Label>
                <Textarea value={reviewData.comments} onChange={e => setReviewData({ ...reviewData, comments: e.target.value })} rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmitReview} disabled={reviewMutation.isPending}>Submit Review</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-slate-500 text-sm mt-0.5">{suppliers.length} suppliers · {totalPending} pending orders</p>
        </div>
        <Button onClick={() => openForm()} className="gap-2">
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>

      {/* Quick Stats */}
      {suppliers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Suppliers", value: suppliers.length, color: "text-slate-700" },
            { label: "Active", value: suppliers.filter(s => s.is_active).length, color: "text-green-600" },
            { label: "Pending Orders", value: totalPending, color: "text-amber-600" },
            { label: "Unassigned Items", value: unassignedItems.length, color: "text-red-500" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Suppliers Grid */}
      {suppliers.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 mb-4">No suppliers yet. Add your first supplier to get started.</p>
          <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" />Add Supplier</Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(supplier => {
            const orders = purchaseOrders.filter(o => o.supplier_id === supplier.id);
            const items = inventoryItems.filter(i => i.supplier_id === supplier.id);
            const pending = orders.filter(o => ["pending_approval", "pending", "confirmed", "shipped"].includes(o.status));
            return (
              <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-base leading-tight">{supplier.name}</h3>
                      {supplier.rating > 0 && (
                        <span className={`flex items-center gap-1 text-xs font-semibold mt-0.5 ${getRatingColor(supplier.rating)}`}>
                          <Star className="w-3 h-3 fill-current" />{supplier.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <Badge variant={supplier.is_active ? "default" : "secondary"} className="text-xs">
                      {supplier.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {supplier.contact_person && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-1"><User className="w-3 h-3" />{supplier.contact_person}</p>
                  )}
                  {supplier.phone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-2"><Phone className="w-3 h-3" />{supplier.phone}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center">
                    <div>
                      <p className="text-xs text-slate-400">Orders</p>
                      <p className="font-bold text-sm">{orders.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Pending</p>
                      <p className={`font-bold text-sm ${pending.length > 0 ? "text-amber-600" : ""}`}>{pending.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Items</p>
                      <p className="font-bold text-sm">{items.length}</p>
                    </div>
                  </div>

                  <SupplierBalanceStrip
                    totalSpent={getSupplierSpent(supplier.id)}
                    totalPaid={getSupplierPaid(supplier.id)}
                    remaining={getSupplierRemaining(supplier.id)}
                    canPay={canPaySupplier}
                    onPay={() => setPayingSupplier(supplier)}
                  />

                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1" onClick={() => setSelectedSupplier(supplier)}>View Details</Button>
                    <Button size="sm" variant="outline" onClick={() => openForm(supplier)}><Edit className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete this supplier?")) deleteMutation.mutate(supplier.id); }}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SupplierPayDialog
        open={!!payingSupplier}
        onOpenChange={(open) => {
          if (!open) setPayingSupplier(null);
        }}
        supplier={payingSupplier}
        branchId={selectedBranchId}
        branchName={selectedBranch?.name}
        totalSpent={payingSupplier ? getSupplierSpent(payingSupplier.id) : 0}
        totalPaid={payingSupplier ? getSupplierPaid(payingSupplier.id) : 0}
        remaining={payingSupplier ? getSupplierRemaining(payingSupplier.id) : 0}
      />

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Supplier Name *</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="ABC Suppliers Ltd" />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} placeholder="John Doe" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="contact@supplier.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+20 10 0000 0000" />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="123 Business St, Cairo" />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Input value={formData.payment_terms} onChange={e => setFormData({ ...formData, payment_terms: e.target.value })} placeholder="Net 30, COD, Prepaid..." />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingSupplier ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}