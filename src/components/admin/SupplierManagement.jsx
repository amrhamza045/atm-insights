import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SuppliedCategoriesField from "@/components/admin/SuppliedCategoriesField";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Star, Package, PoundSterling, TrendingUp, Phone, Mail, MapPin, User } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import { useHasPermission } from "@/components/permissions/PermissionsContext";
import SupplierPayDialog from "@/components/purchasing/SupplierPayDialog";
import { useSupplierTotals, useSupplierPaymentHistory } from "@/components/purchasing/useSupplierPayments";
import { SupplierBalanceStrip, SupplierBalanceCards, SupplierPaymentsList } from "@/components/purchasing/SupplierPaymentSummary";

export default function SupplierManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [payingSupplier, setPayingSupplier] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    payment_terms: "",
    notes: ""
  });
  const [reviewData, setReviewData] = useState({
    delivery_rating: 5,
    quality_rating: 5,
    comments: ""
  });

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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier created");
      handleClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier updated");
      handleClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier deleted");
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async (data) => {
      const overall = (data.delivery_rating + data.quality_rating) / 2;
      await base44.entities.SupplierReview.create({
        ...data,
        overall_rating: overall,
        reviewed_by: (await base44.auth.me()).email
      });

      // Update supplier aggregated ratings
      const supplier = suppliers.find(s => s.id === data.supplier_id);
      if (supplier) {
        const allReviews = await base44.entities.SupplierReview.filter({ supplier_id: data.supplier_id });
        const avgDelivery = allReviews.reduce((sum, r) => sum + r.delivery_rating, 0) / allReviews.length;
        const avgQuality = allReviews.reduce((sum, r) => sum + r.quality_rating, 0) / allReviews.length;
        const avgOverall = allReviews.reduce((sum, r) => sum + r.overall_rating, 0) / allReviews.length;

        await base44.entities.Supplier.update(data.supplier_id, {
          delivery_performance: avgDelivery,
          quality_rating: avgQuality,
          rating: avgOverall
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplierReviews"] });
      toast.success("Review submitted");
      setShowReviewDialog(false);
      setReviewData({ delivery_rating: 5, quality_rating: 5, comments: "" });
    }
  });

  const handleOpen = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name || "",
        contact_person: supplier.contact_person || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        payment_terms: supplier.payment_terms || "",
        notes: supplier.notes || "",
        supplied_category_ids: supplier.supplied_category_ids || [],
        supplied_category_names: supplier.supplied_category_names || []
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        payment_terms: "",
        notes: "",
        supplied_category_ids: [],
        supplied_category_names: []
      });
    }
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingSupplier(null);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Supplier name is required");
      return;
    }

    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleReview = (order) => {
    setReviewOrderId(order.id);
    setReviewData({
      delivery_rating: 5,
      quality_rating: 5,
      comments: ""
    });
    setShowReviewDialog(true);
  };

  const handleSubmitReview = () => {
    const order = purchaseOrders.find(o => o.id === reviewOrderId);
    if (!order || !order.supplier_id) {
      toast.error("Cannot find order or supplier");
      return;
    }

    reviewMutation.mutate({
      supplier_id: order.supplier_id,
      supplier_name: order.supplier,
      purchase_order_id: order.id,
      ...reviewData
    });
  };

  const supplierOrders = selectedSupplier
    ? purchaseOrders.filter(o => o.supplier_id === selectedSupplier.id)
    : [];

  const supplierItems = selectedSupplier
    ? inventoryItems.filter(i => i.supplier_id === selectedSupplier.id)
    : [];

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-blue-600";
    if (rating >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Supplier Management</h2>
        <Button onClick={() => handleOpen()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      {/* Suppliers Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((supplier) => {
          const orders = purchaseOrders.filter(o => o.supplier_id === supplier.id);
          const items = inventoryItems.filter(i => i.supplier_id === supplier.id);
          
          return (
            <Card key={supplier.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{supplier.name}</h3>
                    {supplier.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className={`w-4 h-4 fill-current ${getRatingColor(supplier.rating)}`} />
                        <span className={`text-sm font-semibold ${getRatingColor(supplier.rating)}`}>
                          {supplier.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge variant={supplier.is_active ? "default" : "secondary"}>
                    {supplier.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {supplier.supplied_category_names?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {supplier.supplied_category_names.map((n) => (
                      <Badge key={n} variant="outline" className="text-xs">{n}</Badge>
                    ))}
                  </div>
                )}

                {supplier.contact_person && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                    <User className="w-3 h-3" />
                    <span>{supplier.contact_person}</span>
                  </div>
                )}

                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                    <Phone className="w-3 h-3" />
                    <span>{supplier.phone}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Orders</p>
                    <p className="font-bold text-sm">{orders.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Items</p>
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

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedSupplier(supplier)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpen(supplier)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Delete this supplier?")) {
                        deleteMutation.mutate(supplier.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {suppliers.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 mb-4">No suppliers yet</p>
          <Button onClick={() => handleOpen()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Supplier
          </Button>
        </Card>
      )}

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supplier Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ABC Suppliers Ltd"
                />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@supplier.com"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Business St, City, Country"
              />
            </div>

            <div>
              <Label>Payment Terms</Label>
              <Input
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="Net 30, Net 60, COD, Prepaid"
              />
            </div>

            <SuppliedCategoriesField
              value={formData.supplied_category_ids}
              onChange={(ids, names) => setFormData({ ...formData, supplied_category_ids: ids, supplied_category_names: names })}
            />

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information about the supplier"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave}>
                {editingSupplier ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Details Dialog */}
      {selectedSupplier && (
        <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{selectedSupplier.name}</DialogTitle>
                <div className="flex gap-2">
                  {selectedSupplier.rating > 0 && (
                    <Badge className="gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      {selectedSupplier.rating.toFixed(1)}
                    </Badge>
                  )}
                  <Badge variant={selectedSupplier.is_active ? "default" : "secondary"}>
                    {selectedSupplier.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="info" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="payments">
                  Payments ({supplierPayments.length})
                </TabsTrigger>
                <TabsTrigger value="orders">Orders ({supplierOrders.length})</TabsTrigger>
                <TabsTrigger value="items">Items ({supplierItems.length})</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {selectedSupplier.contact_person && (
                    <div>
                      <p className="text-sm text-slate-500">Contact Person</p>
                      <p className="font-medium">{selectedSupplier.contact_person}</p>
                    </div>
                  )}
                  {selectedSupplier.email && (
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium">{selectedSupplier.email}</p>
                    </div>
                  )}
                  {selectedSupplier.phone && (
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="font-medium">{selectedSupplier.phone}</p>
                    </div>
                  )}
                  {selectedSupplier.payment_terms && (
                    <div>
                      <p className="text-sm text-slate-500">Payment Terms</p>
                      <p className="font-medium">{selectedSupplier.payment_terms}</p>
                    </div>
                  )}
                </div>

                {selectedSupplier.address && (
                  <div>
                    <p className="text-sm text-slate-500">Address</p>
                    <p className="font-medium">{selectedSupplier.address}</p>
                  </div>
                )}

                <div className="pt-4 border-t space-y-4">
                  <SupplierBalanceCards
                    totalSpent={getSupplierSpent(selectedSupplier.id)}
                    totalPaid={getSupplierPaid(selectedSupplier.id)}
                    remaining={getSupplierRemaining(selectedSupplier.id)}
                    canPay={canPaySupplier}
                    onPay={() => setPayingSupplier(selectedSupplier)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-blue-500" />
                          <p className="text-sm text-slate-500">Total Orders</p>
                        </div>
                        <p className="text-2xl font-bold">{supplierOrders.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-amber-500" />
                          <p className="text-sm text-slate-500">Avg Rating</p>
                        </div>
                        <p className="text-2xl font-bold">{selectedSupplier.rating?.toFixed(1) || "N/A"}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {selectedSupplier.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-slate-500 mb-2">Notes</p>
                    <p className="text-sm bg-slate-50 p-3 rounded">{selectedSupplier.notes}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="space-y-3">
                <SupplierPaymentsList payments={supplierPayments} />
              </TabsContent>

              <TabsContent value="orders" className="space-y-3">
                {supplierOrders.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No orders from this supplier</p>
                ) : (
                  supplierOrders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{order.order_number}</h4>
                            <p className="text-sm text-slate-600">{order.inventory_category_name}</p>
                          </div>
                          <Badge>{order.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500">Date</p>
                            <p className="font-medium">{new Date(order.order_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Items</p>
                            <p className="font-medium">{order.items?.length || 0}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Total</p>
                            <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                          </div>
                        </div>
                        {order.status === "delivered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 gap-1"
                            onClick={() => handleReview(order)}
                          >
                            <Star className="w-3 h-3" />
                            Rate This Order
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="items" className="space-y-3">
                {supplierItems.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No items associated with this supplier</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {supplierItems.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">{item.name}</h4>
                          <div className="text-sm space-y-1">
                            <p className="text-slate-600">Stock: {item.quantity} {item.unit}</p>
                            {item.cost_per_unit && (
                              <p className="text-slate-600">Cost: {formatCurrency(item.cost_per_unit)}/{item.unit}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No reviews yet</p>
                ) : (
                  reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Star className="w-4 h-4 fill-current text-amber-500" />
                              <span className="font-bold">{review.overall_rating.toFixed(1)}</span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {new Date(review.created_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-slate-600">Delivery: {review.delivery_rating}/5</p>
                            <p className="text-slate-600">Quality: {review.quality_rating}/5</p>
                          </div>
                        </div>
                        {review.comments && (
                          <p className="text-sm bg-slate-50 p-3 rounded">{review.comments}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Pay Supplier Dialog */}
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

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Supplier Performance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Delivery Performance</Label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 cursor-pointer ${
                      star <= reviewData.delivery_rating ? "fill-current text-amber-500" : "text-slate-300"
                    }`}
                    onClick={() => setReviewData({ ...reviewData, delivery_rating: star })}
                  />
                ))}
                <span className="ml-2 font-medium">{reviewData.delivery_rating}/5</span>
              </div>
            </div>

            <div>
              <Label>Product Quality</Label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 cursor-pointer ${
                      star <= reviewData.quality_rating ? "fill-current text-amber-500" : "text-slate-300"
                    }`}
                    onClick={() => setReviewData({ ...reviewData, quality_rating: star })}
                  />
                ))}
                <span className="ml-2 font-medium">{reviewData.quality_rating}/5</span>
              </div>
            </div>

            <div>
              <Label>Comments (Optional)</Label>
              <Textarea
                value={reviewData.comments}
                onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                placeholder="Share your experience with this supplier..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmitReview}>Submit Review</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}