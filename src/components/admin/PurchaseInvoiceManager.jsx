import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { uploadPrivateReceipt, fileLinkProps } from "@/lib/privateFiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Eye, Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import { overBy, OverReceiptLine, OverReceiptConfirm } from "@/components/purchasing/OverReceiptWarning";
import { companyToday } from "@/components/utils/timezoneHelper";
import { InvoiceStatusBadge, PostInvoiceButton } from "@/components/purchasing/InvoiceStatusControls";
import EventsPaginationBar from "@/components/catering/EventsPaginationBar";
import usePaginatedPurchaseInvoices from "@/components/purchasing/usePaginatedPurchaseInvoices";
import PurchaseInvoiceFilters, { EMPTY_INVOICE_FILTERS, hasInvoiceFilters } from "@/components/purchasing/PurchaseInvoiceFilters";

export default function PurchaseInvoiceManager() {
  const [formOpen, setFormOpen] = useState(false);
  const [invoiceFilters, setInvoiceFilters] = useState(EMPTY_INVOICE_FILTERS);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editReceiptUrl, setEditReceiptUrl] = useState("");
  const [editUploadingReceipt, setEditUploadingReceipt] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("pcs");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [itemPiecesCount, setItemPiecesCount] = useState("");
  const [itemExpiryDate, setItemExpiryDate] = useState("");
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState("");
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [overConfirmed, setOverConfirmed] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [formData, setFormData] = useState({
    invoice_number: "",
    supplier_id: "",
    invoice_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const invoicesListTopRef = useRef(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("name")
  });

  const { data: allInventory = [] } = useQuery({
    queryKey: ["inventoryItems", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.InventoryItem.list("-created_date");
      return all.filter(i => !selectedBranchId || i.branch_id === selectedBranchId);
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("name")
  });

  const {
    items: invoices,
    totalCount: totalInvoicesCount,
    page: invoicesPage,
    totalPages: totalInvoicePages,
    pageSize: invoicesPageSize,
    hasNextPage: hasNextInvoicesPage,
    hasPrevPage: hasPrevInvoicesPage,
    filterKey: invoicesFilterKey,
    isLoading: isLoadingInvoices,
    isFetchingPage: isFetchingInvoicesPage,
    goToNextPage: goToNextInvoicesPage,
    goToPrevPage: goToPrevInvoicesPage,
    goToPage: goToInvoicesPage,
  } = usePaginatedPurchaseInvoices({
    branchId: selectedBranchId,
    statusFilter: invoiceFilters.status,
    dateFrom: invoiceFilters.from,
    dateTo: invoiceFilters.to,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.PurchaseOrder.list("-created_date");
      return all.filter(po => !selectedBranchId || po.branch_id === selectedBranchId);
    }
  });

  const confirmedOrders = purchaseOrders.filter(
    po =>
      (po.status === "confirmed" || po.status === "pending") &&
      po.rfq_status !== "open" &&
      po.rfq_status !== "quoted" &&
      !po.purchase_recorded_invoice_id
  );

  const categoryItems = selectedCategory 
    ? allInventory.filter(item => item.category_id === selectedCategory)
    : [];

  const createInvoiceMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke("processPurchaseInvoice", {
        invoice: {
          ...data,
          branch_id: data.branch_id || selectedBranchId,
          branch_name: data.branch_name || selectedBranch?.name
        }
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      toast.success("Invoice saved as Draft — a manager must post it to update stock");
      handleCloseForm();
    },
    onError: (error) => {
      toast.error("Failed to create invoice: " + error.message);
    }
  });

  const handleAddItem = () => {
    if (!selectedItem) {
      toast.error("Please select an item");
      return;
    }
    if (itemExpiryDate && itemExpiryDate < companyToday()) {
      toast.error("Expiry date is in the past — expired products can't be received");
      return;
    }

    if (!itemQuantity || !itemUnitPrice) {
      toast.error("Please enter quantity and unit price");
      return;
    }

    if (selectedUnit === "weight" && !itemPiecesCount) {
      toast.error("Please enter the number of pieces for weight-based items");
      return;
    }

    const currentItem = invoiceItems.find(i => i.inventory_item_id === selectedItem);
    if (currentItem) {
      toast.error("This item is already added");
      return;
    }

    const item = allInventory.find(i => i.id === selectedItem);
    if (!item) return;

    const qty = parseFloat(itemQuantity);
    const unitPrice = parseFloat(itemUnitPrice);
    const totalCost = qty * unitPrice;
    
    // Calculate price per piece
    let pricePerPcs = unitPrice;
    if (selectedUnit === "weight") {
      const piecesQty = parseFloat(itemPiecesCount);
      pricePerPcs = totalCost / piecesQty;
    }

    setInvoiceItems([
      ...invoiceItems,
      {
        inventory_item_id: selectedItem,
        inventory_item_name: item.name,
        category_id: item.category_id,
        category_name: item.category_name,
        quantity: qty,
        unit: selectedUnit === "weight" ? (item.selling_unit_label || "kg") : "pcs",
        unit_type: selectedUnit,
        purchase_price: unitPrice,
        price_per_pcs: pricePerPcs,
        pieces_count: selectedUnit === "weight" ? parseFloat(itemPiecesCount) : qty,
        total_cost: totalCost,
        expiry_date: itemExpiryDate
      }
    ]);

    setSelectedItem("");
    setItemQuantity("");
    setItemUnitPrice("");
    setItemPiecesCount("");
    setItemExpiryDate("");
    setSelectedUnit("pcs");
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...invoiceItems];
    updated[index][field] = value;

    // Calculate total cost
    if (field === "quantity" || field === "purchase_price") {
      const qty = parseFloat(updated[index].quantity) || 0;
      const price = parseFloat(updated[index].purchase_price) || 0;
      updated[index].total_cost = qty * price;
    }

    setInvoiceItems(updated);
  };

  const handleRemoveItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleUploadReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      setReceiptUrl(await uploadPrivateReceipt(file));
      setReceiptFile(null);
      toast.success("Receipt uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload receipt: " + error.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmitInvoice = async () => {
    const selectedPo = purchaseOrders.find(p => p.id === selectedPurchaseOrder);
    const resolvedBranchId = selectedBranchId || selectedPo?.branch_id || "";
    const resolvedBranchName = selectedBranch?.name || selectedPo?.branch_name || "";
    if (!resolvedBranchId) {
      toast.error("Please select a branch before creating an invoice");
      return;
    }

    if (!formData.supplier_id) {
      toast.error("Supplier is required");
      return;
    }

    if (invoiceItems.some(item => item.expiry_date && item.expiry_date < companyToday())) {
      toast.error("One or more items have an expiry date in the past — expired products can't be received");
      return;
    }

    if (invoiceItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    // Validate all items have quantity and price
    if (invoiceItems.some(item => !item.quantity || !item.purchase_price)) {
      toast.error("All items must have quantity and purchase price");
      return;
    }

    const invoiceData = {
      invoice_number: formData.invoice_number,
      supplier_id: formData.supplier_id,
      supplier_name: suppliers.find(s => s.id === formData.supplier_id)?.name,
      invoice_date: formData.invoice_date,
      items: invoiceItems.map(item => ({
        inventory_item_id: item.inventory_item_id,
        inventory_item_name: item.inventory_item_name,
        category_id: item.category_id,
        category_name: item.category_name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        unit_type: item.unit_type,
        purchase_price: parseFloat(item.purchase_price),
        price_per_pcs: item.price_per_pcs,
        pieces_count: item.pieces_count,
        total_cost: item.total_cost,
        expiry_date: item.expiry_date
      })),
      branch_id: resolvedBranchId,
      branch_name: resolvedBranchName,
      notes: formData.notes,
      receipt_url: receiptUrl,
      total_amount: invoiceItems.reduce((sum, item) => sum + item.total_cost, 0)
    };

    await createInvoiceMutation.mutateAsync(invoiceData);
  };

  const handleSelectPurchaseOrder = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    setSelectedPurchaseOrder(poId);
    setFormData(prev => ({
      ...prev,
      supplier_id: po.supplier_id,
    }));

    // Auto-populate items from PO
    const poItems = po.items.map(item => ({
      inventory_item_id: item.inventory_item_id,
      inventory_item_name: item.inventory_item_name,
      category_id: po.inventory_category_id,
      category_name: po.inventory_category_name,
      quantity: item.quantity_ordered,
      ordered_quantity: item.quantity_ordered,
      unit: item.purchase_unit_label || item.unit,
      unit_type: item.purchase_unit,
      purchase_price: item.unit_price,
      price_per_pcs: item.unit_price,
      pieces_count: item.quantity_ordered,
      total_cost: item.total_price,
      expiry_date: ""
    }));

    setInvoiceItems(poItems);
  };

  const generateInvoiceNumber = () => {
    return `INV-${Date.now()}`;
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setFormData({
      invoice_number: "",
      supplier_id: "",
      invoice_date: new Date().toISOString().split('T')[0],
      notes: ""
    });
    setInvoiceItems([]);
    setOverConfirmed(false);
    setSelectedCategory("");
    setSelectedItem("");
    setSelectedPurchaseOrder("");
    setItemQuantity("");
    setItemUnitPrice("");
    setItemPiecesCount("");
    setItemExpiryDate("");
    setSelectedUnit("pcs");
    setReceiptUrl("");
    setReceiptFile(null);
  };

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setEditingInvoiceId(invoice.id);
    setEditReceiptUrl(invoice.receipt_url || "");
    setDetailsOpen(true);
  };

  const handleEditReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingInvoiceId) return;

    setEditUploadingReceipt(true);
    try {
      const result = { file_url: await uploadPrivateReceipt(file) };
      await base44.entities.PurchaseInvoice.update(editingInvoiceId, {
        receipt_url: result.file_url
      });
      setEditReceiptUrl(result.file_url);
      setSelectedInvoice(prev => ({ ...prev, receipt_url: result.file_url }));
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      toast.success("Receipt updated successfully");
    } catch (error) {
      toast.error("Failed to upload receipt: " + error.message);
    } finally {
      setEditUploadingReceipt(false);
    }
  };

  const handleRemoveEditReceipt = async () => {
    if (!editingInvoiceId) return;
    
    try {
      await base44.entities.PurchaseInvoice.update(editingInvoiceId, {
        receipt_url: ""
      });
      setEditReceiptUrl("");
      setSelectedInvoice(prev => ({ ...prev, receipt_url: "" }));
      queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] });
      toast.success("Receipt removed");
    } catch (error) {
      toast.error("Failed to remove receipt: " + error.message);
    }
  };

  const overCount = invoiceItems.filter((i) => overBy(i.quantity, i.ordered_quantity)).length;

  const totalInvoiceAmount = invoiceItems.reduce((sum, item) => sum + item.total_cost, 0);

  return (
    <div className="space-y-6">
      {/* Invoices List */}
      <div ref={invoicesListTopRef} className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Purchase Invoices</h2>
            <p className="text-sm text-slate-500">Manage received purchase invoices and track item costs</p>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>

        <PurchaseInvoiceFilters value={invoiceFilters} onChange={setInvoiceFilters} />

        {isLoadingInvoices ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 flex items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              <span>Loading purchase invoices…</span>
            </CardContent>
          </Card>
        ) : invoices.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">{hasInvoiceFilters(invoiceFilters) ? "No invoices match these filters" : "No invoices yet"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <motion.div
              key={`inv-list-page-${invoicesPage}-${invoicesFilterKey}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="space-y-3"
            >
              {invoices.map(invoice => (
                <Card key={invoice.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">{invoice.invoice_number}</h3>
                          <Badge variant="outline">{invoice.supplier_name}</Badge>
                          <InvoiceStatusBadge invoice={invoice} />
                        </div>
                        <p className="text-sm text-slate-500">
                          {invoice.items?.length || 0} items • {new Date(invoice.invoice_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(invoice.total_amount || 0)}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(invoice)}
                          className="mt-2"
                        >
                          <Eye className="w-3 h-3 mr-2" />
                          View
                        </Button>
                        <div><PostInvoiceButton invoice={invoice} /></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            <EventsPaginationBar
              page={invoicesPage}
              totalPages={totalInvoicePages}
              pageSize={invoicesPageSize}
              currentCount={invoices.length}
              totalCount={totalInvoicesCount}
              itemLabel="purchase invoices"
              hasPrevPage={hasPrevInvoicesPage}
              hasNextPage={hasNextInvoicesPage}
              isFetchingPage={isFetchingInvoicesPage}
              onPrevPage={goToPrevInvoicesPage}
              onNextPage={goToNextInvoicesPage}
              onGoToPage={goToInvoicesPage}
              scrollTargetRef={invoicesListTopRef}
            />
          </div>
        )}
      </div>



      {/* New Invoice Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => {
        if (open && !editingInvoiceId && !formData.invoice_number) {
          setFormData(prev => ({ ...prev, invoice_number: generateInvoiceNumber() }));
        }
        setFormOpen(open);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvoiceId ? "Edit Purchase Invoice" : "Create Purchase Invoice"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Select Purchase Order */}
            {confirmedOrders.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-xs font-semibold text-blue-900 block mb-2">Select Purchase Order (Optional)</Label>
                <select
                  value={selectedPurchaseOrder}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectPurchaseOrder(e.target.value);
                    } else {
                      setSelectedPurchaseOrder("");
                      setInvoiceItems([]);
                      setFormData(prev => ({ ...prev, supplier_id: "" }));
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">-- No Purchase Order --</option>
                  {confirmedOrders.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.order_number} ({po.supplier}) - {po.items?.length || 0} items
                    </option>
                  ))}
                </select>
                {selectedPurchaseOrder && invoiceItems.length > 0 && (
                  <p className="text-xs text-blue-700 mt-2">
                    ✓ Loaded {invoiceItems.length} items from purchase order
                  </p>
                )}
              </div>
            )}

            {/* Invoice Details */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-xs">Invoice Number (Auto-Generated)</Label>
                <div className="mt-1 px-3 py-2 border rounded-lg bg-white text-sm font-mono text-slate-700">
                  {formData.invoice_number}
                </div>
              </div>
              <div>
                <Label className="text-xs">Supplier</Label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  disabled={!!selectedPurchaseOrder}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1 disabled:bg-slate-100"
                >
                  <option value="">Select supplier</option>
                  {suppliers.filter(s => s.is_active).map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Invoice Date</Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Auto-Loaded Items from PO - Editable */}
            {invoiceItems.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-sm text-blue-900 mb-3">Items from Purchase Order</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-blue-100">
                      <TableRow>
                        <TableHead className="text-xs">Item</TableHead>
                        <TableHead className="text-xs">Unit Type</TableHead>
                        <TableHead className="text-xs">Quantity</TableHead>
                        <TableHead className="text-xs">Unit Price</TableHead>
                        <TableHead className="text-xs">Pieces Count</TableHead>
                        <TableHead className="text-xs">Cost/Piece</TableHead>
                        <TableHead className="text-xs">Expiry</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceItems.map((item, idx) => {
                        const piecesCount = item.pieces_count || item.quantity;
                        const costPerPiece = piecesCount > 0 ? (item.total_cost || 0) / piecesCount : 0;
                        return (
                          <TableRow key={idx} className="hover:bg-blue-100">
                            <TableCell className="text-sm">{item.inventory_item_name}</TableCell>
                            <TableCell className="text-sm">
                              <select
                                value={item.unit_type || "pcs"}
                                onChange={(e) => {
                                  const newItems = [...invoiceItems];
                                  newItems[idx].unit_type = e.target.value;
                                  newItems[idx].unit = e.target.value === "weight" ? "kg" : "pcs";
                                  setInvoiceItems(newItems);
                                }}
                                className="w-20 px-2 py-1 border rounded text-xs"
                              >
                                <option value="pcs">Pieces</option>
                                <option value="weight">Weight</option>
                              </select>
                            </TableCell>
                            <TableCell className="text-sm">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...invoiceItems];
                                  newItems[idx].quantity = parseFloat(e.target.value) || 0;
                                  newItems[idx].total_cost = newItems[idx].quantity * newItems[idx].purchase_price;
                                  setInvoiceItems(newItems);
                                  setOverConfirmed(false);
                                }}
                                className={`w-20 h-8 ${overBy(item.quantity, item.ordered_quantity) ? "border-amber-400 bg-amber-50" : ""}`}
                              />
                              <OverReceiptLine received={item.quantity} ordered={item.ordered_quantity} unit={item.unit} />
                            </TableCell>
                            <TableCell className="text-sm">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.purchase_price}
                                onChange={(e) => {
                                  const newItems = [...invoiceItems];
                                  newItems[idx].purchase_price = parseFloat(e.target.value) || 0;
                                  newItems[idx].total_cost = newItems[idx].quantity * newItems[idx].purchase_price;
                                  setInvoiceItems(newItems);
                                }}
                                className="w-24 h-8"
                              />
                            </TableCell>
                            <TableCell className="text-sm">
                              <Input
                                type="number"
                                step="1"
                                value={item.pieces_count || item.quantity}
                                onChange={(e) => {
                                  const newItems = [...invoiceItems];
                                  newItems[idx].pieces_count = parseFloat(e.target.value) || 0;
                                  newItems[idx].price_per_pcs = (newItems[idx].total_cost || 0) / (parseFloat(e.target.value) || 1);
                                  setInvoiceItems(newItems);
                                }}
                                className="w-20 h-8"
                              />
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-blue-600">
                              {formatCurrency(costPerPiece)}
                            </TableCell>
                            <TableCell className="text-sm">
                              <Input
                                type="date"
                                min={companyToday()}
                                value={item.expiry_date || ""}
                                onChange={(e) => {
                                  const newItems = [...invoiceItems];
                                  newItems[idx].expiry_date = e.target.value;
                                  setInvoiceItems(newItems);
                                }}
                                className="min-w-32 h-8"
                              />
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-right">
                              {formatCurrency(item.total_cost || 0)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  const newItems = invoiceItems.filter((_, i) => i !== idx);
                                  setInvoiceItems(newItems);
                                }}
                                className="h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Add Items Section */}
            <div className="p-4 bg-green-50 rounded-lg space-y-3 border border-green-200">
              <h3 className="font-semibold text-sm text-green-900">Add More Items</h3>
              <div className={`grid gap-3 ${selectedUnit === "weight" ? "grid-cols-8" : "grid-cols-7"}`}>
               <div>
                 <Label className="text-xs">Category</Label>
                 <select
                   value={selectedCategory}
                   onChange={(e) => {
                     setSelectedCategory(e.target.value);
                     setSelectedItem("");
                   }}
                   className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                 >
                   <option value="">Select category</option>
                   {categories.map(cat => (
                     <option key={cat.id} value={cat.id}>{cat.name}</option>
                   ))}
                 </select>
               </div>
               <div>
                 <Label className="text-xs">Item</Label>
                 <select
                   value={selectedItem}
                   onChange={(e) => setSelectedItem(e.target.value)}
                   disabled={!selectedCategory}
                   className="w-full px-3 py-2 border rounded-lg text-sm mt-1 disabled:bg-slate-100"
                 >
                   <option value="">Select item</option>
                   {categoryItems.map(item => (
                     <option key={item.id} value={item.id}>{item.name}</option>
                   ))}
                 </select>
               </div>
               <div>
                 <Label className="text-xs">Unit Type</Label>
                 <select
                   value={selectedUnit}
                   onChange={(e) => {
                     setSelectedUnit(e.target.value);
                     setItemPiecesCount("");
                   }}
                   className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                 >
                   <option value="pcs">Pieces</option>
                   <option value="weight">Weight (kg)</option>
                 </select>
               </div>
               <div>
                 <Label className="text-xs">Qty ({selectedUnit === "weight" ? "kg" : "pcs"})</Label>
                 <Input
                   type="number"
                   step="0.01"
                   value={itemQuantity}
                   onChange={(e) => setItemQuantity(e.target.value)}
                   placeholder="0"
                   className="mt-1"
                 />
               </div>
               <div>
                 <Label className="text-xs">Price per {selectedUnit === "weight" ? "kg" : "pcs"}</Label>
                 <Input
                   type="number"
                   step="0.01"
                   value={itemUnitPrice}
                   onChange={(e) => setItemUnitPrice(e.target.value)}
                   placeholder="0"
                   className="mt-1"
                 />
               </div>
               <div>
                 <Label className="text-xs">Expiry Date (optional)</Label>
                 <Input
                   type="date"
                   min={companyToday()}
                   value={itemExpiryDate}
                   onChange={(e) => setItemExpiryDate(e.target.value)}
                   className="mt-1"
                 />
               </div>
               {selectedUnit === "weight" && (
                 <div>
                   <Label className="text-xs">Pieces Count</Label>
                   <Input
                     type="number"
                     step="1"
                     value={itemPiecesCount}
                     onChange={(e) => setItemPiecesCount(e.target.value)}
                     placeholder="0"
                     className="mt-1"
                   />
                 </div>
               )}
               <Button onClick={handleAddItem} className={`${selectedUnit === "weight" ? "mt-6" : "mt-6"} h-9`}>
                 <Plus className="w-4 h-4 mr-2" />
                 Add
               </Button>
              </div>
            </div>



            {/* Receipt Upload */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Label className="text-xs font-semibold text-purple-900 block mb-2">Receipt Scan (Optional)</Label>
              {receiptUrl ? (
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 bg-white p-3 rounded-lg flex-1">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <p className="text-xs text-slate-600 truncate">Receipt uploaded</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReceiptUrl("")}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleUploadReceipt}
                    disabled={uploadingReceipt}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploadingReceipt}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingReceipt ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs">Notes</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1 h-20 resize-none"
              />
            </div>

            {/* Summary */}
            {invoiceItems.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-amber-900">Total Invoice Amount:</span>
                  <span className="text-xl font-bold text-amber-900">{formatCurrency(totalInvoiceAmount)}</span>
                </div>
              </div>
            )}

            <OverReceiptConfirm count={overCount} checked={overConfirmed} onChange={setOverConfirmed} />

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={handleCloseForm}>Cancel</Button>
              <Button 
                onClick={handleSubmitInvoice}
                disabled={createInvoiceMutation.isPending || invoiceItems.length === 0 || (overCount > 0 && !overConfirmed)}
              >
                {createInvoiceMutation.isPending ? "Saving..." : editingInvoiceId ? "Update Invoice" : "Create Invoice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedInvoice?.invoice_number}
              {selectedInvoice && <InvoiceStatusBadge invoice={selectedInvoice} />}
              {selectedInvoice && <PostInvoiceButton invoice={selectedInvoice} onPosted={() => setDetailsOpen(false)} />}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg text-sm">
                <div>
                  <p className="text-slate-600">Supplier</p>
                  <p className="font-semibold">{selectedInvoice.supplier_name}</p>
                </div>
                <div>
                  <p className="text-slate-600">Date</p>
                  <p className="font-semibold">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-slate-600">Total</p>
                  <p className="font-semibold">{formatCurrency(selectedInvoice.total_amount)}</p>
                </div>
              </div>

              {selectedInvoice.items && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="text-xs">Item</TableHead>
                        <TableHead className="text-xs">Qty</TableHead>
                        <TableHead className="text-xs">Unit</TableHead>
                        <TableHead className="text-xs">Pieces Count</TableHead>
                        <TableHead className="text-xs">Unit Price</TableHead>
                        <TableHead className="text-xs">Price/Pcs</TableHead>
                        <TableHead className="text-xs">Expiry</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{item.inventory_item_name}</TableCell>
                          <TableCell className="text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-sm">{item.unit}</TableCell>
                          <TableCell className="text-sm font-medium">{item.pieces_count || item.quantity}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(item.purchase_price)}</TableCell>
                          <TableCell className="text-sm text-blue-600">{formatCurrency(item.price_per_pcs)}</TableCell>
                          <TableCell className="text-sm">{item.expiry_date || "—"}</TableCell>
                          <TableCell className="text-sm font-semibold text-right">
                            {formatCurrency(item.total_cost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Receipt Upload/Edit Section */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-900 font-semibold mb-3">Receipt Scan</p>
                {editReceiptUrl ? (
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 bg-white p-3 rounded-lg flex-1">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <a {...fileLinkProps(editReceiptUrl)} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline truncate">
                        View Receipt
                      </a>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveEditReceipt}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mb-3">No receipt uploaded</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleEditReceipt}
                    disabled={editUploadingReceipt}
                    className="flex-1 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={editUploadingReceipt}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {editUploadingReceipt ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Notes</p>
                  <p className="text-sm">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}