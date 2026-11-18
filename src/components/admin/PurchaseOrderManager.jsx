import { useRef, useState } from "react";
import { motion } from "framer-motion";
import EventScopeChip, { useUrlEventId } from "@/components/shared/EventScopeChip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Eye, Edit, CheckCircle, Package, Loader2, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { readableOrderNumber } from "@/components/purchasing/orderNumber";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PurchaseItemAdder from '@/components/purchasing/PurchaseItemAdder';
import PurchaseUnitSelect from '@/components/purchasing/PurchaseUnitSelect';
import usePurchaseUnits from '@/components/purchasing/usePurchaseUnits';
import { purchaseUnitPrice, purchaseUnitType, purchaseUnitOptions, changePurchaseUnit } from '@/components/purchasing/purchaseUnits';
import { getItemCostUnit, getItemStockUnit, normalizeUnit } from '@/lib/unitConversion';
import { useBranch } from "@/components/branches/BranchContext";
import RecordPurchaseDialog from "@/components/purchasing/cart/RecordPurchaseDialog";
import { suppliersForCategory } from "@/components/purchasing/supplierCategories";
import { assertOrderSupplierCovers } from "@/components/purchasing/supplierCategoryGuard";
import SupplierFilterNote from "@/components/purchasing/SupplierFilterNote";
import SupplierCombobox from "@/components/purchasing/SupplierCombobox";
import SupplierRfqItemSelector from "@/components/purchasing/rfq/SupplierRfqItemSelector";
import RecordRfqPricesDialog from "@/components/purchasing/rfq/RecordRfqPricesDialog";
import PurchaseOrderDetailsDialog from "@/components/purchasing/rfq/PurchaseOrderDetailsDialog";
import PurchaseOrderReviewDialog from "@/components/purchasing/rfq/PurchaseOrderReviewDialog";
import { syncCateringPurchaseOrder } from "@/components/catering/procurement";
import EventsPaginationBar from "@/components/catering/EventsPaginationBar";
import usePaginatedPurchaseOrders from "@/components/purchasing/usePaginatedPurchaseOrders";

export default function PurchaseOrderManager() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [orderItems, setOrderItems] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);
  const [supplierContact, setSupplierContact] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");



  // Review dialog state (approval per item)
  const [reviewDialog, setReviewDialog] = useState(null);
  const [itemApprovals, setItemApprovals] = useState({}); // { item_id: "approved" | "rejected" }

  // Receive/Cancel dialog state
  const [receiveConfirmDialog, setReceiveConfirmDialog] = useState(null);
  const [cancelReasonDialog, setCancelReasonDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  // Record-purchase dialog (generates the invoice that actually moves stock)
  const [recordDialog, setRecordDialog] = useState(null);
  // RFQ quote recording & conversion dialog
  const [rfqPriceDialog, setRfqPriceDialog] = useState(null);

  // Filters
  const [supplierFilter, setSupplierFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const scopedEventId = useUrlEventId();
  const ordersListTopRef = useRef(null);

  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("-created_date")
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItems", selectedCategory, selectedBranchId],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const items = await base44.entities.InventoryItem.filter({ category_id: selectedCategory });
      return items.filter(i => !selectedBranchId || i.branch_id === selectedBranchId);
    },
    enabled: !!selectedCategory
  });

  // Fetch ALL inventory items for stock display during review
  const { data: allInventoryItems = [] } = useQuery({
    queryKey: ["allInventoryItems", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.InventoryItem.list();
      return all.filter(i => !selectedBranchId || i.branch_id === selectedBranchId);
    }
  });

  const {
    items: filteredOrders,
    totalCount: totalOrdersCount,
    page: ordersPage,
    totalPages: totalOrderPages,
    pageSize: ordersPageSize,
    hasNextPage: hasNextOrdersPage,
    hasPrevPage: hasPrevOrdersPage,
    filterKey: ordersFilterKey,
    isLoading: isLoadingOrders,
    isFetchingPage: isFetchingOrdersPage,
    goToNextPage: goToNextOrdersPage,
    goToPrevPage: goToPrevOrdersPage,
    goToPage: goToOrdersPage,
  } = usePaginatedPurchaseOrders({
    branchId: selectedBranchId,
    statusFilter,
    supplierFilter,
    categoryFilter,
    scopedEventId,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("name")
  });
  const supplierChoice = suppliersForCategory(suppliers, selectedCategory, showAllSuppliers);

  // Fetch invoices to calculate average prices
  const { data: invoices = [] } = useQuery({
    queryKey: ["purchaseInvoices", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.PurchaseInvoice.list("-created_date", 100);
      return all.filter(inv => !selectedBranchId || inv.branch_id === selectedBranchId);
    }
  });

  const { catalog, rules: unitRules, loading: unitsLoading, error: unitsError } = usePurchaseUnits();

  const isRfqOrder = (o) => o && (o.rfq_status === "open" || o.rfq_status === "quoted");

  // ── Create RFQ / Order ───────────────────────────────────────────────────────
  const createOrderMutation = useMutation({
    mutationFn: async (data) => {
      await assertOrderSupplierCovers(data.supplierId, data.supplier, data.items);
      const user = await base44.auth.me().catch(() => null);
      const nowIso = new Date().toISOString();
      const rfqNumber = readableOrderNumber({ prefix: "RFQ", neededBy: data.expectedDelivery, supplierName: data.supplier });
      const categoryName = data.categoryId
        ? categories.find(c => c.id === data.categoryId)?.name
        : "Multi-Category";

      return base44.entities.PurchaseOrder.create({
        order_number: rfqNumber,
        rfq_number: rfqNumber,
        rfq_status: "open",
        rfq_created_at: nowIso,
        created_by_email: user?.email || "",
        inventory_category_id: data.categoryId || null,
        inventory_category_name: categoryName,
        items: data.items.map(i => ({
          ...i,
          unit_price: 0,
          total_price: 0,
          approval_status: "pending",
        })),
        supplier_id: data.supplierId,
        supplier: data.supplier,
        supplier_contact: data.supplierContact,
        order_date: nowIso.split('T')[0],
        expected_delivery_date: data.expectedDelivery,
        total_amount: 0,
        status: "pending_approval",
        notes: data.notes,
        branch_id: selectedBranchId,
        branch_name: selectedBranch?.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("RFQ created — record supplier quoted prices when received to convert to a PO");
      handleClose();
    },
    onError: (e) => toast.error(e.message)
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await assertOrderSupplierCovers(data.supplier_id, data.supplier, data.items);
      return base44.entities.PurchaseOrder.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success(isRfqOrder(editingOrder) ? "RFQ updated" : "Purchase order updated");
      setEditingOrder(null);
      handleClose();
    },
    onError: (e) => toast.error(e.message)
  });

  const saveRfqQuotesMutation = useMutation({
    mutationFn: async ({ order, items, totalAmount, notes: quoteNotes }) => {
      const user = await base44.auth.me().catch(() => null);
      return base44.entities.PurchaseOrder.update(order.id, {
        items,
        total_amount: totalAmount,
        notes: quoteNotes,
        rfq_status: "quoted",
        rfq_quoted_at: new Date().toISOString(),
        rfq_quoted_by: user?.email || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("Quoted prices saved on RFQ");
      setRfqPriceDialog(null);
    },
    onError: (e) => toast.error(e.message || "Could not save quoted prices")
  });

  const convertRfqToPoMutation = useMutation({
    mutationFn: async ({ order, items, totalAmount, notes: quoteNotes }) => {
      const user = await base44.auth.me().catch(() => null);
      const nowIso = new Date().toISOString();
      const poNumber = readableOrderNumber({
        prefix: "PO-MAN",
        neededBy: order.expected_delivery_date,
        supplierName: order.supplier,
      });
      return base44.entities.PurchaseOrder.update(order.id, {
        order_number: poNumber,
        rfq_number: order.rfq_number || order.order_number,
        rfq_status: "converted",
        rfq_quoted_at: order.rfq_quoted_at || nowIso,
        rfq_quoted_by: order.rfq_quoted_by || user?.email || "",
        rfq_converted_at: nowIso,
        rfq_converted_by: user?.email || "",
        items,
        total_amount: totalAmount,
        notes: quoteNotes,
        status: "pending_approval",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("RFQ converted to Purchase Order — ready for review & approval");
      setRfqPriceDialog(null);
      setSelectedOrder(null);
    },
    onError: (e) => toast.error(e.message || "Could not convert RFQ to PO")
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, cancellationReason }) => {
      const data = { status };
      if (cancellationReason) {
        data.cancellation_reason = cancellationReason;
      }
      const updated = await base44.entities.PurchaseOrder.update(id, data);
      const targetOrder =
        filteredOrders.find((o) => o.id === id) ||
        (selectedOrder?.id === id ? selectedOrder : null) ||
        (receiveConfirmDialog?.id === id ? receiveConfirmDialog : null) ||
        (cancelReasonDialog?.id === id ? cancelReasonDialog : null);
      await syncCateringPurchaseOrder(targetOrder, queryClient);
      return updated;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["event-cart-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      const statusMsg = status === "received" ? "Order marked as received" : "Order cancelled";
      toast.success(statusMsg);
      setSelectedOrder(null);
      setReceiveConfirmDialog(null);
      setCancelReasonDialog(null);
      setCancelReason("");
    }
  });

  // ── Review / Approve items then finalize PO ────────────────────────────────
  const handleOpenReview = (order) => {
    const initial = {};
    (order.items || []).forEach(item => {
      initial[item.inventory_item_id] = item.approval_status || "pending";
    });
    setItemApprovals(initial);
    setReviewDialog(order);
  };

  const finalizeReviewMutation = useMutation({
    mutationFn: async ({ order, approvals }) => {
      const user = await base44.auth.me().catch(() => null);

      // Self-approval is allowed — created_by_email and reviewed_by are still
      // stamped separately so the audit trail shows when they are the same person.

      const approvedItems = order.items.filter(i => approvals[i.inventory_item_id] === "approved");

      if (approvedItems.length === 0) {
        // All rejected — cancel the PO
        await base44.entities.PurchaseOrder.update(order.id, {
          status: "cancelled",
          items: order.items.map(i => ({ ...i, approval_status: approvals[i.inventory_item_id] || "rejected" })),
          reviewed_by: user?.email,
          reviewed_at: new Date().toISOString()
        });
        await syncCateringPurchaseOrder(order, queryClient);
        return "cancelled";
      }

      const approvedTotal = approvedItems.reduce((s, i) => s + (i.total_price || 0), 0);

      await base44.entities.PurchaseOrder.update(order.id, {
        status: "pending",
        items: order.items.map(i => ({ ...i, approval_status: approvals[i.inventory_item_id] || "pending" })),
        total_amount: approvedTotal,
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString()
      });

      // Update supplier stats for approved total
      if (order.supplier_id) {
        const sup = suppliers.find(s => s.id === order.supplier_id);
        if (sup) {
          await base44.entities.Supplier.update(order.supplier_id, {
            total_orders: (sup.total_orders || 0) + 1,
            total_spent: (sup.total_spent || 0) + approvedTotal
          });
        }
      }

      await syncCateringPurchaseOrder(order, queryClient);
      return "approved";
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      if (result === "cancelled") {
        toast.success("All items rejected — order cancelled");
      } else {
        toast.success("PO approved and moved to pending");
      }
      setReviewDialog(null);
      setSelectedOrder(null);
    },
    onError: (err) => toast.error(err?.message || "Could not finalize this purchase order")
  });



  // ── Misc ───────────────────────────────────────────────────────────────────
  const deleteOrderMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("Purchase order deleted");
      setSelectedOrder(null);
    }
  });

  const handleAddItem = (item, selectedUnit = null, existingItems = null) => {
    const currentList = existingItems || orderItems;
    if (currentList.find(o => o.inventory_item_id === item.id)) {
      if (!existingItems) toast.error("Item already added");
      return currentList;
    }
    const unitLabel = normalizeUnit(selectedUnit || getItemCostUnit(item));
    if (unitsLoading || unitsError || !purchaseUnitOptions(item, catalog, unitRules).some(u => u.code === unitLabel)) {
      toast.error(`Cannot order ${item.name}: load units and define a valid purchase-to-stock conversion first`);
      return currentList;
    }
    const unitToUse = purchaseUnitType(unitLabel);
    const avgPrice = purchaseUnitPrice(item, unitLabel, invoices, unitRules);
    const systemStock = allInventoryItems.find(i => i.id === item.id)?.quantity ?? null;
    const newItem = {
      inventory_item_id: item.id,
      inventory_item_name: item.name,
      quantity_ordered: 0,
      purchase_unit: unitToUse,
      purchase_unit_label: unitLabel,
      selling_unit: item.selling_unit || "pcs",
      selling_unit_label: getItemStockUnit(item),
      received_selling_qty: null,
      approval_status: "pending",
      unit: unitLabel,
      unit_price: avgPrice,
      base_unit_price: avgPrice,
      manual_unit_price: "",
      total_price: 0,
      system_stock: systemStock,
      manual_balance: "",
      manual_balance_unit: getItemStockUnit(item)
    };
    const updated = [...currentList, newItem];
    if (!existingItems) setOrderItems(updated);
    return updated;
  };

  const handleLoadSupplierItems = () => {
    if (!selectedSupplierId) return;
    const supplierItems = allInventoryItems.filter(i => i.supplier_id === selectedSupplierId);
    if (supplierItems.length === 0) {
      toast.info("No inventory items have this supplier set as preferred supplier");
      return;
    }
    let current = [...orderItems];
    let added = 0;
    supplierItems.forEach(item => {
      if (!current.find(o => o.inventory_item_id === item.id)) {
        const updated = handleAddItem(item, null, current);
        if (updated.length > current.length) added++;
        current = updated;
      }
    });
    setOrderItems(current);
    if (added > 0) toast.success(`${added} item(s) loaded for this supplier`);
    else toast.info("All supplier items are already in the order");
  };

  const handleCreateOrder = () => {
    const submittableItems = orderItems.filter(i => (parseFloat(i.quantity_ordered) || 0) > 0);
    if (submittableItems.length === 0 || (!selectedSupplierId && !supplier)) {
      toast.error("Please add items with qty > 0 and select a supplier");
      return;
    }
    if (unitsLoading || unitsError || submittableItems.some(line => {
      const inventory = allInventoryItems.find(i => i.id === line.inventory_item_id);
      return !inventory || !purchaseUnitOptions(inventory, catalog, unitRules)
        .some(u => u.code === normalizeUnit(line.purchase_unit_label || line.unit));
    })) {
      toast.error('Every order item needs a valid conversion to its defined purchase and stock units');
      return;
    }
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    const data = {
      categoryId: selectedCategory,
      items: submittableItems,
      supplierId: selectedSupplierId,
      supplier: selectedSupplier ? selectedSupplier.name : supplier,
      supplierContact: selectedSupplier ? selectedSupplier.phone || selectedSupplier.email : supplierContact,
      expectedDelivery,
      notes
    };

    if (editingOrder) {
      const totalAmount = orderItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
      updateOrderMutation.mutate({
        id: editingOrder.id,
        data: {
          inventory_category_id: selectedCategory || null,
          inventory_category_name: selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : "Multi-Category",
          items: submittableItems,
          supplier_id: selectedSupplierId,
          supplier: data.supplier,
          supplier_contact: data.supplierContact,
          expected_delivery_date: expectedDelivery,
          total_amount: totalAmount,
          notes
        }
      });
    } else {
      createOrderMutation.mutate(data);
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setSelectedCategory(order.inventory_category_id);
    setOrderItems(order.items || []);
    setSelectedSupplierId(order.supplier_id || "");
    setSupplier(order.supplier);
    setSupplierContact(order.supplier_contact || "");
    setExpectedDelivery(order.expected_delivery_date);
    setNotes(order.notes || "");
    setShowForm(true);
    setSelectedOrder(null);
  };

  const handleClose = () => {
    setShowForm(false);
    setSelectedCategory("");
    setOrderItems([]);
    setSelectedSupplierId("");
    setSupplier("");
    setSupplierContact("");
    setExpectedDelivery("");
    setNotes("");
    setEditingOrder(null);
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + (item.total_price || 0), 0);

  const getOrderDisplayStatus = (orderOrStatus) => {
    if (typeof orderOrStatus === "object" && orderOrStatus !== null) {
      if (orderOrStatus.rfq_status === "open") return "rfq_open";
      if (orderOrStatus.rfq_status === "quoted") return "rfq_quoted";
      return orderOrStatus.status;
    }
    return orderOrStatus;
  };

  const getStatusColor = (orderOrStatus) => {
    const status = getOrderDisplayStatus(orderOrStatus);
    switch (status) {
      case "rfq":
      case "rfq_open": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "rfq_quoted": return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "recommended": return "bg-purple-100 text-purple-700 border-purple-200";
      case "pending_approval": return "bg-warning-100 text-warning-700 border-warning-200";
      case "pending": return "bg-warning-100 text-warning-700 border-warning-200";
      case "confirmed": return "bg-blue-100 text-blue-700 border-blue-200";
      case "delivered": return "bg-green-100 text-green-700 border-green-200";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (orderOrStatus) => {
    const status = getOrderDisplayStatus(orderOrStatus);
    if (status === "rfq" || status === "rfq_open") return "RFQ (Awaiting Quote)";
    if (status === "rfq_quoted") return "RFQ (Prices Recorded)";
    if (status === "pending_approval") return "Awaiting Approval";
    if (status === "recommended") return "Recommended";
    return String(status || "").charAt(0).toUpperCase() + String(status || "").slice(1);
  };

  // helper: get current stock for an item id
  const getStock = (itemId) => {
    const inv = allInventoryItems.find(i => i.id === itemId);
    return inv ? inv.quantity : null;
  };

  const isCreatingOrEditingRfq = !editingOrder || isRfqOrder(editingOrder);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Purchase Orders & RFQs</h3>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Order / RFQ
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders & RFQs</SelectItem>
              <SelectItem value="rfq">RFQs (Awaiting / Quoted)</SelectItem>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="pending_approval">Awaiting Approval</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="Filter by supplier name..."
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-48"
          />

          <Input
            type="text"
            placeholder="Filter by category name..."
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-48"
          />

          {(supplierFilter || categoryFilter) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSupplierFilter("");
                setCategoryFilter("");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div ref={ordersListTopRef} className="space-y-3">
        {scopedEventId && <EventScopeChip eventId={scopedEventId} />}
        {isLoadingOrders ? (
          <Card className="p-8 flex items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            <span>Loading purchase orders…</span>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500">
              {statusFilter === "all" ? "No purchase orders yet" : `No ${getStatusLabel(statusFilter)} orders`}
            </p>
          </Card>
        ) : (
          <>
            <motion.div
              key={`po-page-${ordersPage}-${ordersFilterKey}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="space-y-3"
            >
              {filteredOrders.map(order => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold">{order.order_number}</h4>
                        {order.rfq_number && order.rfq_number !== order.order_number && (
                          <p className="text-xs text-indigo-600">From {order.rfq_number}</p>
                        )}
                        <p className="text-sm text-slate-600">{order.inventory_category_name}</p>
                        {order.expected_delivery_date && (
                          <p className="text-xs text-slate-500 mt-1">
                            Expected: {new Date(order.expected_delivery_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={getStatusColor(order)}>
                          {getStatusLabel(order)}
                        </Badge>
                        {order.order_source === "catering" && (
                          <>
                            {order.urgency === "urgent" && order.status !== "cancelled" && (
                              <Badge className="bg-red-100 text-red-700 border-red-200">Urgent · catering</Badge>
                            )}
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 max-w-[220px] truncate">
                              {order.catering_trigger === "planning_horizon" ? "Plan-ahead" : "Shortfall"}:{" "}
                              {order.catering_event_ids?.length > 1
                                ? `${order.catering_event_ids.length} events`
                                : order.catering_event_name}
                            </Badge>
                            {order.catering_event_ids?.length > 1 && (
                              <span className="text-xs text-slate-500 max-w-[240px] truncate" title={(order.catering_event_names || []).join(", ")}>
                                {(order.catering_event_names || []).join(", ")}
                              </span>
                            )}
                            {order.needed_by_date && (
                              <span className="text-xs text-slate-500">Needed by {new Date(order.needed_by_date).toLocaleDateString()}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-slate-500">Supplier</p>
                        <p className="font-medium truncate">{order.supplier}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Items</p>
                        <p className="font-medium">{order.items?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Total</p>
                        <p className="font-medium">
                          {isRfqOrder(order) && !(Number(order.total_amount) > 0)
                            ? "Awaiting Quote"
                            : formatCurrency(order.total_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)} className="gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                      {isRfqOrder(order) && (
                        <Button
                          size="sm"
                          onClick={() => setRfqPriceDialog(order)}
                          className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <FileCheck2 className="w-3 h-3" />
                          Record RFQ Prices & Convert to PO
                        </Button>
                      )}
                      {!isRfqOrder(order) &&
                        (order.status === "pending_approval" || order.status === "recommended" ||
                        (order.status === "pending" && order.items?.some(i => !i.approval_status || i.approval_status === "pending"))) && (
                        <Button size="sm" onClick={() => handleOpenReview(order)} className="gap-1 bg-orange-500 hover:bg-orange-600">
                          <CheckCircle className="w-3 h-3" />
                          Review & Approve
                        </Button>
                      )}
                      {!isRfqOrder(order) && (order.status === "pending" || order.status === "confirmed") && (
                        <Button size="sm" onClick={() => setRecordDialog(order)} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                          <Package className="w-3 h-3" />
                          Verify & Record Purchase
                        </Button>
                      )}
                      {(isRfqOrder(order) || order.status === "pending_approval" || order.status === "recommended") && (
                        <Button size="sm" variant="outline" onClick={() => handleEditOrder(order)} className="gap-1">
                          <Edit className="w-3 h-3" />
                          {isRfqOrder(order) ? "Edit RFQ" : "Edit"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            <EventsPaginationBar
              page={ordersPage}
              totalPages={totalOrderPages}
              pageSize={ordersPageSize}
              currentCount={filteredOrders.length}
              totalCount={totalOrdersCount}
              itemLabel="purchase orders"
              hasPrevPage={hasPrevOrdersPage}
              hasNextPage={hasNextOrdersPage}
              isFetchingPage={isFetchingOrdersPage}
              onPrevPage={goToPrevOrdersPage}
              onNextPage={goToNextOrdersPage}
              onGoToPage={goToOrdersPage}
              scrollTargetRef={ordersListTopRef}
            />
          </>
        )}
      </div>

      {/* ── Create/Edit RFQ or Order Dialog ─────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrder
                ? isRfqOrder(editingOrder)
                  ? `Edit Request for Quotation — ${editingOrder.order_number}`
                  : `Edit Purchase Order — ${editingOrder.order_number}`
                : "Create Request for Quotation (RFQ)"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category (optional filter)</Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  disabled={editingOrder && editingOrder.status !== "pending_approval"}
                >
                  <option value="">All supplied categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Select a supplier to start an RFQ</p>
              </div>
              <div>
                <Label>Supplier *</Label>
                <SupplierCombobox
                  className="w-full"
                  value={selectedSupplierId}
                  options={supplierChoice.list.filter(s => s.is_active !== false || s.id === selectedSupplierId).map(sup => ({
                    value: sup.id,
                    label: `${sup.name}${sup.rating > 0 ? ` (${sup.rating.toFixed(1)} ⭐)` : ""}`,
                    sub: sup.phone || sup.email || ""
                  }))}
                  onChange={(id) => {
                    if (id !== selectedSupplierId && !editingOrder) {
                      setOrderItems([]);
                    }
                    setSelectedSupplierId(id);
                    const selected = suppliers.find(s => s.id === id);
                    if (selected) {
                      setSupplier(selected.name);
                      setSupplierContact(selected.phone || selected.email || "");
                    }
                  }}
                />
                <SupplierFilterNote {...supplierChoice} showAll={showAllSuppliers} onShowAllChange={setShowAllSuppliers} />
              </div>
            </div>

            {selectedSupplierId && suppliers.find(s => s.id === selectedSupplierId) && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Supplier Information</p>
                  {isCreatingOrEditingRfq && (
                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                      RFQ Mode — No prices required yet
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {suppliers.find(s => s.id === selectedSupplierId).contact_person && (
                    <p className="text-slate-600">Contact: {suppliers.find(s => s.id === selectedSupplierId).contact_person}</p>
                  )}
                  {suppliers.find(s => s.id === selectedSupplierId).phone && (
                    <p className="text-slate-600">Phone: {suppliers.find(s => s.id === selectedSupplierId).phone}</p>
                  )}
                  {suppliers.find(s => s.id === selectedSupplierId).payment_terms && (
                    <p className="text-slate-600">Terms: {suppliers.find(s => s.id === selectedSupplierId).payment_terms}</p>
                  )}
                  {suppliers.find(s => s.id === selectedSupplierId).rating > 0 && (
                    <p className="text-slate-600">Rating: {suppliers.find(s => s.id === selectedSupplierId).rating.toFixed(1)} ⭐</p>
                  )}
                </div>
              </div>
            )}

            {isCreatingOrEditingRfq ? (
              <SupplierRfqItemSelector
                supplier={suppliers.find(s => s.id === selectedSupplierId)}
                allInventoryItems={allInventoryItems}
                invoices={invoices}
                selectedCategory={selectedCategory}
                orderItems={orderItems}
                onOrderItemsChange={setOrderItems}
                catalog={catalog}
                unitRules={unitRules}
                unitsLoading={unitsLoading}
                unitsError={unitsError}
              />
            ) : (
              <>
                {selectedCategory && (
                  <div>
                    <Label className="mb-2 block">Available Items</Label>
                    {unitsError && <p role="alert" className="text-sm text-destructive">Could not load unit conversion rules. Reopen this screen to try again.</p>}
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                      {inventoryItems.map(item => (
                        <PurchaseItemAdder key={item.id} item={item} catalog={catalog} rules={unitRules}
                          invoices={invoices} loading={unitsLoading || !!unitsError} onAdd={handleAddItem} />
                      ))}
                    </div>
                  </div>
                )}

                {orderItems.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Order Items ({orderItems.length})</Label>
                    <div className="space-y-2 border rounded-lg p-2 max-h-96 overflow-y-auto">
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded text-sm border border-slate-200 space-y-2 mb-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{item.inventory_item_name}</p>
                              <p className="text-xs text-slate-500">
                                {formatCurrency(item.unit_price)}/{item.purchase_unit_label || item.unit}
                              </p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}>
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Qty to Order</p>
                              <div className="flex items-center gap-1">
                                <NumberInput type="number" min="0" step="0.01" value={item.quantity_ordered}
                                  onChange={(e) => {
                                    const newQty = parseFloat(e.target.value) || 0;
                                    const updated = [...orderItems];
                                    updated[idx] = { ...item, quantity_ordered: newQty, total_price: newQty * item.unit_price };
                                    setOrderItems(updated);
                                  }}
                                  className="w-full px-2 py-1 border rounded text-sm"
                                />
                                <PurchaseUnitSelect item={allInventoryItems.find(i => i.id === item.inventory_item_id)}
                                  value={normalizeUnit(item.purchase_unit_label || item.unit)} catalog={catalog} rules={unitRules}
                                  disabled={unitsLoading || !!unitsError} onChange={unit => {
                                    const inventory = allInventoryItems.find(i => i.id === item.inventory_item_id);
                                    setOrderItems(prev => prev.map((line, index) => index === idx
                                      ? changePurchaseUnit(line, unit, inventory, unitRules, 'quantity_ordered') : line));
                                  }} />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Unit Price</p>
                              <NumberInput type="number" min="0" step="0.01" value={item.unit_price}
                                onChange={(e) => {
                                  const price = parseFloat(e.target.value) || 0;
                                  const updated = [...orderItems];
                                  updated[idx] = { ...item, unit_price: price, total_price: (parseFloat(item.quantity_ordered) || 0) * price };
                                  setOrderItems(updated);
                                }}
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-right">
                      <span className="text-sm text-slate-600 mr-2">Order Total:</span>
                      <span className="text-lg font-bold text-amber-700">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <Label className="mb-2 block">Expected Delivery Date</Label>
              <Input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or special instructions for the supplier"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleCreateOrder}
                disabled={createOrderMutation.isPending || updateOrderMutation.isPending}
              >
                {(createOrderMutation.isPending || updateOrderMutation.isPending)
                  ? "Saving..."
                  : editingOrder
                    ? isRfqOrder(editingOrder)
                      ? "Update RFQ"
                      : "Update Order"
                    : "Create RFQ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Order Details Dialog ─────────────────────────────────────────────── */}
      <PurchaseOrderDetailsDialog
        selectedOrder={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        getStatusColor={getStatusColor}
        getStatusLabel={getStatusLabel}
        isRfqOrder={isRfqOrder}
        onOpenRfqPricing={(order) => setRfqPriceDialog(order)}
        onOpenReview={handleOpenReview}
        onConfirmOrder={(order) => updateStatusMutation.mutate({ id: order.id, status: "confirmed" })}
        onOpenDeliverConfirm={(order) => setReceiveConfirmDialog(order)}
        onOpenCancelReason={(order) => setCancelReasonDialog(order)}
        onOpenRecordPurchase={(order) => setRecordDialog(order)}
        onEditOrder={handleEditOrder}
        onDeleteOrder={(order) => {
          if (confirm("Delete this purchase order?")) deleteOrderMutation.mutate(order.id);
        }}
      />

      {/* ── Record RFQ Prices & Convert to PO Dialog ─────────────────────────── */}
      <RecordRfqPricesDialog
        order={rfqPriceDialog}
        open={!!rfqPriceDialog}
        onOpenChange={(v) => !v && setRfqPriceDialog(null)}
        onSaveDraftQuotes={(payload) => saveRfqQuotesMutation.mutate(payload)}
        onConvertToPo={(payload) => convertRfqToPoMutation.mutate(payload)}
        isPending={saveRfqQuotesMutation.isPending || convertRfqToPoMutation.isPending}
      />

      {/* ── Deliver Confirmation Dialog ──────────────────────────────────────── */}
      {receiveConfirmDialog && (
        <Dialog open={!!receiveConfirmDialog} onOpenChange={() => setReceiveConfirmDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Order as Delivered</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>{receiveConfirmDialog.order_number}</strong> will be marked as delivered and the status will be updated.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReceiveConfirmDialog(null)}>Cancel</Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate({ id: receiveConfirmDialog.id, status: "delivered" })}
                >
                  {updateStatusMutation.isPending ? "Confirming..." : "Confirm Delivered"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Cancellation Reason Dialog ────────────────────────────────────────── */}
      {cancelReasonDialog && (
        <Dialog open={!!cancelReasonDialog} onOpenChange={() => { setCancelReasonDialog(null); setCancelReason(""); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  You are about to cancel <strong>{cancelReasonDialog.order_number}</strong>. Please provide a reason for the cancellation.
                </p>
              </div>
              <div>
                <Label>Cancellation Reason *</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Explain why this order is being cancelled..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setCancelReasonDialog(null); setCancelReason(""); }}>Go Back</Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700"
                  disabled={updateStatusMutation.isPending || !cancelReason.trim()}
                  onClick={() => updateStatusMutation.mutate({ id: cancelReasonDialog.id, status: "cancelled", cancellationReason: cancelReason })}
                >
                  {updateStatusMutation.isPending ? "Cancelling..." : "Cancel Order"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Record Purchase Dialog (two-step: save edits, then invoice + stock) ─ */}
      <RecordPurchaseDialog
        order={recordDialog}
        open={!!recordDialog}
        onOpenChange={(v) => !v && setRecordDialog(null)}
      />

      {/* ── Review & Approve Dialog ──────────────────────────────────────────── */}
      <PurchaseOrderReviewDialog
        reviewDialog={reviewDialog}
        onClose={() => setReviewDialog(null)}
        itemApprovals={itemApprovals}
        setItemApprovals={setItemApprovals}
        getStock={getStock}
        onFinalize={(payload) => finalizeReviewMutation.mutate(payload)}
        isPending={finalizeReviewMutation.isPending}
      />


    </div>
  );
}