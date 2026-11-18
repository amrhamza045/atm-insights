import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, AlertTriangle, Package, Upload, Download, MessageSquare, TrendingUp, FileText, CheckCircle, Clock, ChevronDown, ChevronUp, Search, Loader2, ArrowRightLeft } from "lucide-react";
import EventsPaginationBar from "@/components/catering/EventsPaginationBar";
import BranchInventoryTransferCard from "@/components/admin/BranchInventoryTransferCard";
import usePaginatedInventoryItems from "@/components/inventory/usePaginatedInventoryItems";
import { toast } from "sonner";
import InventoryCategoryManagement from "@/components/admin/InventoryCategoryManagement";
import InventoryForecastingTool from "@/components/admin/InventoryForecastingTool";
import DraftPOsList from "@/components/inventory/DraftPOsList";
import LastPurchaseCostField from "@/components/inventory/LastPurchaseCostField";
import UnitFuzzySelect from "@/components/inventory/UnitFuzzySelect";
import { buildLatestPurchaseCostMap } from "@/components/inventory/lastPurchaseCost";
import { createExpiryReportForInventoryItem } from "@/components/inventory/createExpiryReport";
import { quantityChange, logStockMovements } from "@/lib/stockMovements";
import { resolveConversionFactor, normalizeUnit, roundQty } from "@/lib/unitConversion";

import { formatCurrency } from "@/components/utils/currencyFormatter";
import PermissionGuard from "@/components/permissions/PermissionGuard";
import { useBranch } from "@/components/branches/BranchContext";
import { useLanguage } from "@/components/LanguageProvider";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import RequestedItemsTab from "@/components/inventory/requisitions/RequestedItemsTab";
import StorageLocationsTab from "@/components/inventory/storage/StorageLocationsTab";
import { listLocations } from "@/components/inventory/storage/storageApi";
import { useLinkedRequisition } from "@/components/catering/requisition/useLinkedRequisition";


export default function InventoryManagement() {
  const { language } = useLanguage();
  const itemName = (item) => (language === "ar" && item.arabic_name) || item.name;
  const { selectedBranch, selectedBranchId } = useBranch();
  const { assigned } = usePermissions();
  // Same assigned flags as perm_requisition_view in the requisition data rules.
  const canViewRequisitions = assigned?.requisition_view === true;
  const [activeTab, setActiveTab] = useState("items");
  // Tabs closed in Admin › Modules are left out; a closed tab falls back to the first open one.
  const screenTabs = useScreenTabs("InventoryManagement");
  const shownTab = screenTabs.pick(activeTab, ["items", "forecasting", "draft-pos", "categories", "storage", ...(canViewRequisitions ? ["requested-items"] : [])]);
  // A requisition notification link opens Requested Items (the tab opens the requisition itself).
  useLinkedRequisition(() => setActiveTab("requested-items"), canViewRequisitions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [showBranchTransfer, setShowBranchTransfer] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [bulkText, setBulkText] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    unit: "",
    low_stock_threshold: "",
    cost_per_unit: "",
    supplier: ""
  });

  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lowStockExpanded, setLowStockExpanded] = useState(false);
  const itemsListTopRef = useRef(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("-created_date")
  });

  const {
    items: pagedInventory,
    filteredAllItems: inventory,
    totalCount,
    page,
    totalPages,
    pageSize,
    hasNextPage,
    hasPrevPage,
    filterKey,
    isLoading: isLoadingInventory,
    isFetchingPage,
    goToNextPage,
    goToPrevPage,
    goToPage,
  } = usePaginatedInventoryItems({
    branchId: selectedBranchId,
    categoryId: selectedCategory,
    search: searchQuery,
    categories,
  });

  const { data: storageLocations = [] } = useQuery({
    queryKey: ["storageLocations", selectedBranchId],
    queryFn: () => listLocations(selectedBranchId),
    enabled: !!selectedBranchId
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("name")
  });

  const { data: purchaseInvoices = [] } = useQuery({
    queryKey: ["purchaseInvoices", selectedBranchId],
    queryFn: async () => {
      const invoices = await base44.entities.PurchaseInvoice.list("-created_date", 1000);
      return invoices.filter(invoice => !selectedBranchId || !invoice.branch_id || invoice.branch_id === selectedBranchId);
    }
  });

  const { data: openExpiryReports = [] } = useQuery({
    queryKey: ["expiryReports"],
    queryFn: () => base44.entities.ExpiryReport.list("expiry_date", 1000)
  });

  const { data: unitRules = [] } = useQuery({
    queryKey: ["unitConversionRules"],
    queryFn: async () => {
      try {
        return await base44.entities.UnitConversionRule.list("-created_date", 500);
      } catch {
        return [];
      }
    }
  });

  const expiryByItem = {};
  openExpiryReports.filter(r => r.status === "open" && r.inventory_item_id).forEach(r => {
    const current = expiryByItem[r.inventory_item_id];
    if (!current || (r.expiry_date || "") < (current.expiry_date || "")) {
      expiryByItem[r.inventory_item_id] = r;
    }
  });
  const latestPurchaseByItem = buildLatestPurchaseCostMap(purchaseInvoices, inventory, unitRules);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const item = await base44.entities.InventoryItem.create(data);
      await createExpiryReportForInventoryItem(item);
      await logStockMovements([quantityChange(item, 0, item.quantity, {
        key: `opening:${item.id}`, type: "opening", source_entity: "InventoryItem", source_id: item.id, source_label: "Opening stock on item creation",
      })]);
      if (item?.id) {
        await base44.functions
          .invoke("branchIsolationManager", {
            action: "mirror_inventory_items",
            inventory_item_ids: [item.id],
          })
          .catch(() => {});
      }
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["expiryReports"] });
      toast.success("Inventory item created and mirrored across branches (0 stock)");
      handleClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const saved = await base44.entities.InventoryItem.update(id, data);
      if (editingItem?.id === id && data.quantity != null) {
        await logStockMovements([quantityChange(editingItem, editingItem.quantity || 0, data.quantity, {
          key: `adjustment:${id}:${Date.now()}`, type: "adjustment", source_entity: "InventoryItem", source_id: id, source_label: "Manual stock edit",
        })]);
      }
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryMovements"] });
      toast.success("Inventory item updated");
      handleClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InventoryItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      toast.success("Inventory item deleted");
    }
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (items) => {
      const scoped = items.map((it) => ({
        ...it,
        branch_id: it.branch_id || selectedBranchId || undefined,
        branch_name: it.branch_name || selectedBranch?.name || undefined,
      }));
      const created = await base44.entities.InventoryItem.bulkCreate(scoped);
      const ids = Array.isArray(created) ? created.map((c) => c?.id).filter(Boolean) : [];
      if (ids.length > 0) {
        await base44.functions
          .invoke("branchIsolationManager", {
            action: "mirror_inventory_items",
            inventory_item_ids: ids,
          })
          .catch(() => {});
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      toast.success("Bulk upload completed and mirrored across branches (0 stock)");
      setBulkUploadOpen(false);
      setBulkText("");
    },
    onError: () => {
      toast.error("Bulk upload failed");
    }
  });

  const autoNewRef = React.useRef(new URLSearchParams(window.location.search).get("new") === "1");
  React.useEffect(() => {
    if (!autoNewRef.current) return;
    autoNewRef.current = false;
    handleOpen();
  });

  const mainStorageId = (storageLocations.find(l => l.name.toLowerCase() === "main storage") || storageLocations[0])?.id || "";

  const handleOpen = (item = null) => {
    if (item) {
      setEditingItem(item);
      const buyType = item.purchase_unit || "pcs";
      const sellType = item.selling_unit || "pcs";
      const rawBuyLabel = item.purchase_unit_label || item.unit || (buyType === "weight" ? "kg" : "pcs");
      const rawSellLabel = item.selling_unit_label || item.unit || (sellType === "weight" ? "kg" : "pcs");
      setFormData({
        name: item.name || "",
        arabic_name: item.arabic_name || "",
        quantity: item.quantity || "",
        unit: normalizeUnit(rawSellLabel) || rawSellLabel,
        purchase_unit: buyType,
        purchase_unit_label: normalizeUnit(rawBuyLabel) || rawBuyLabel,
        selling_unit: sellType,
        selling_unit_label: normalizeUnit(rawSellLabel) || rawSellLabel,
        low_stock_threshold: item.low_stock_threshold || "",
        cost_per_unit: item.cost_per_unit ?? "",
        supplier_id: item.supplier_id || "",
        supplier: item.supplier || "",
        category_id: item.category_id || "",
        storage_location_id: item.storage_location_id || mainStorageId,
        expiry_date: item.expiry_date || ""
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        quantity: "",
        unit: "pcs",
        purchase_unit: "pcs",
        purchase_unit_label: "pcs",
        selling_unit: "pcs",
        selling_unit_label: "pcs",
        low_stock_threshold: "10",
        cost_per_unit: "",
        supplier_id: "",
        supplier: "",
        category_id: selectedCategory,
        storage_location_id: mainStorageId,
        expiry_date: ""
      });
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (!formData.category_id) {
      toast.error("Please select a category");
      return;
    }

    if (!formData.expiry_date) {
      toast.error("Please set the expiry date");
      return;
    }

    const selectedCat = categories.find(c => c.id === formData.category_id);
    const data = {
      name: formData.name,
      arabic_name: formData.arabic_name || "",
      quantity: parseFloat(formData.quantity) || 0,
      unit: formData.selling_unit_label || formData.unit,
      purchase_unit: formData.purchase_unit || "pcs",
      purchase_unit_label: formData.purchase_unit_label,
      selling_unit: formData.selling_unit || "pcs",
      selling_unit_label: formData.selling_unit_label,
      low_stock_threshold: parseFloat(formData.low_stock_threshold) || 10,
      cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : undefined,
      supplier_id: formData.supplier_id || undefined,
      supplier: formData.supplier,
      category_id: formData.category_id,
      category_name: selectedCat?.name,
      storage_location_id: formData.storage_location_id || "",
      storage_location_name: storageLocations.find(l => l.id === formData.storage_location_id)?.name || "",
      expiry_date: formData.expiry_date,
      branch_id: selectedBranchId,
      branch_name: selectedBranch?.name
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const lowStockItems = inventory.filter(item => 
    item.quantity <= (item.low_stock_threshold || 10)
  );

  const handleBulkUpload = () => {
    try {
      const lines = bulkText.trim().split('\n').filter(line => line.trim());
      const items = lines.map(line => {
        const [name, quantity, unit, threshold, cost, supplier] = line.split(',').map(s => s.trim());
        return {
          name,
          quantity: parseFloat(quantity) || 0,
          unit,
          low_stock_threshold: parseFloat(threshold) || 10,
          cost_per_unit: cost ? parseFloat(cost) : undefined,
          supplier: supplier || undefined
        };
      });

      if (items.length === 0) {
        toast.error("No valid items to upload");
        return;
      }

      bulkUploadMutation.mutate(items);
    } catch (error) {
      toast.error("Failed to parse bulk data");
    }
  };

  const exportCSV = () => {
    const csv = [
      "Name,Quantity,Unit,Low Stock Threshold,Cost per Unit,Supplier",
      ...inventory.map(item => 
        `${item.name},${item.quantity},${item.unit},${item.low_stock_threshold || 10},${item.cost_per_unit || ""},${item.supplier || ""}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Inventory exported");
  };

  return (
    <PermissionGuard permission="inventory_view">
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto p-6">
          <Tabs value={shownTab || ""} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Inventory Management</h1>
            {shownTab && (
            <TabsList>
               {screenTabs.isOpen("items") && <TabsTrigger value="items">Items</TabsTrigger>}
               {screenTabs.isOpen("forecasting") && <TabsTrigger value="forecasting">Forecasting</TabsTrigger>}
               {screenTabs.isOpen("draft-pos") && <TabsTrigger value="draft-pos">Draft POs</TabsTrigger>}
               {screenTabs.isOpen("categories") && <TabsTrigger value="categories">Categories</TabsTrigger>}
              {screenTabs.isOpen("storage") && <TabsTrigger value="storage">Storage Locations</TabsTrigger>}
               {canViewRequisitions && screenTabs.isOpen("requested-items") && <TabsTrigger value="requested-items">Requested Items</TabsTrigger>}
            </TabsList>
            )}
          </div>
          {!shownTab && <ClosedTabsNotice />}

          <TabsContent value="items" className="space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center">
                <div>
                  <h2 className="text-lg font-semibold">Inventory Items</h2>
                  {selectedCategory && categories.find(c => c.id === selectedCategory) && (
                    <p className="text-sm text-slate-500">Filtered by: {categories.find(c => c.id === selectedCategory)?.name}</p>
                  )}
                </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-64 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search all item details…"
                    className="pl-9"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={() => setShowBranchTransfer((v) => !v)}
                  className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  {showBranchTransfer ? "Hide Branch Transfer" : "Branch Transfer"}
                </Button>
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
                <Button onClick={() => handleOpen()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
                </div>
              </div>
            </div>

            {showBranchTransfer && <BranchInventoryTransferCard />}

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => setLowStockExpanded(prev => !prev)}
                >
                  <CardTitle className="text-base flex items-center justify-between text-orange-700">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Low Stock Alert ({lowStockItems.length} items)
                      {lowStockExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await base44.functions.invoke('checkLowStockAndNotify', {});
                          toast.success("Low stock SMS alerts sent to admins");
                        } catch (error) {
                          toast.error("Failed to send alerts");
                        }
                      }}
                      className="text-orange-700 border-orange-300 hover:bg-orange-100"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send SMS Alert
                    </Button>
                  </CardTitle>
                </CardHeader>
                {lowStockExpanded && (
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {lowStockItems.map(item => (
                        <Badge key={item.id} variant="outline" className="border-orange-300">
                          <span data-no-translate={item.arabic_name && language === "ar" ? "" : undefined}>{itemName(item)}</span>: {item.quantity} {item.unit}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Inventory Grid */}
            <div ref={itemsListTopRef} className="space-y-4">
              {isLoadingInventory ? (
                <Card className="p-12 flex items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  <span>Loading inventory items…</span>
                </Card>
              ) : pagedInventory.length === 0 ? (
                <Card className="p-8 text-center text-slate-500">No inventory items match your search.</Card>
              ) : (
                <>
                  <motion.div
                    key={`inv-page-${page}-${filterKey}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  >
                    {pagedInventory.map(item => {
                      const isLowStock = item.quantity <= (item.low_stock_threshold || 10);
                      const itemCat = categories.find(c => c.id === item.category_id);
                      const expiryFlag = expiryByItem[item.id];
                      return (
                        <Card key={item.id} className={expiryFlag ? "border-red-300" : isLowStock ? "border-warning-300" : ""}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2 w-full inv-card-head">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${itemCat?.color || "bg-slate-100"}`}>
                                  <Package className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <h3 dir="auto" data-no-translate={item.arabic_name && language === "ar" ? "" : undefined} className="font-semibold text-sm">{itemName(item)}</h3>
                                  {itemCat && <p dir="auto" className="text-xs text-slate-500">{itemCat.name}</p>}
                                </div>
                              </div>
                            </div>

                            {expiryFlag && (
                              <div className="mb-3 flex items-start gap-1.5 rounded-md bg-red-50 border border-red-200 px-2 py-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700">
                                  Expiry reported: {expiryFlag.quantity_at_risk} {expiryFlag.unit || ""} at risk by {expiryFlag.expiry_date}
                                  {expiryFlag.batch_ref ? ` (batch ${expiryFlag.batch_ref})` : ""}
                                </p>
                              </div>
                            )}

                            <div className="space-y-2 mb-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Stock:</span>
                                <span className={`font-semibold ${isLowStock ? "text-warning-600" : ""}`}>
                                  {item.quantity} {item.selling_unit_label || item.unit || (item.selling_unit === "weight" ? "kg" : "pcs")}
                                </span>
                              </div>
                              {item.purchase_unit && item.purchase_unit !== item.selling_unit && (
                                <div className="flex justify-between text-xs text-slate-400">
                                  <span>Buy in:</span>
                                  <span>{item.purchase_unit_label || item.purchase_unit} → sell in: {item.selling_unit_label || item.selling_unit}</span>
                                </div>
                              )}
                              {item.cost_per_unit && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Cost:</span>
                                  <span>{formatCurrency(item.cost_per_unit)}/{item.purchase_unit_label || item.unit}</span>
                                </div>
                              )}
                              {item.expiry_date && (() => {
                                const daysLeft = Math.ceil((new Date(item.expiry_date) - new Date()) / 86400000);
                                const cls = daysLeft < 0 ? "text-red-600 font-semibold" : daysLeft <= 7 ? "text-orange-600 font-semibold" : "";
                                return (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Expiry:</span>
                                    <span className={cls}>
                                      {item.expiry_date}{daysLeft < 0 ? " (expired)" : daysLeft <= 7 ? ` (${daysLeft}d)` : ""}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="flex gap-2 justify-end pt-2 border-t">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleOpen(item)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => deleteMutation.mutate(item.id)}
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </motion.div>

                  <EventsPaginationBar
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    currentCount={pagedInventory.length}
                    totalCount={totalCount}
                    itemLabel="items"
                    hasPrevPage={hasPrevPage}
                    hasNextPage={hasNextPage}
                    isFetchingPage={isFetchingPage}
                    onPrevPage={goToPrevPage}
                    onNextPage={goToNextPage}
                    onGoToPage={goToPage}
                    scrollTargetRef={itemsListTopRef}
                  />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Automated Inventory Forecasting
                </CardTitle>
              </CardHeader>
            </Card>
            <InventoryForecastingTool />
          </TabsContent>

          <TabsContent value="draft-pos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Draft Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DraftPOsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <InventoryCategoryManagement />
          </TabsContent>

          <TabsContent value="storage">
            <StorageLocationsTab categories={categories} />
          </TabsContent>

          {canViewRequisitions && (
            <TabsContent value="requested-items">
              <RequestedItemsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Arabic name (optional)</Label>
              <Input
                dir="rtl"
                data-no-translate
                value={formData.arabic_name || ""}
                onChange={(e) => setFormData({ ...formData, arabic_name: e.target.value })}
                placeholder="الاسم بالعربية"
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={formData.category_id || ""}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Storage Location</Label>
              <select
                value={formData.storage_location_id || ""}
                onChange={(e) => setFormData({ ...formData, storage_location_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {storageLocations.length === 0 && <option value="">Main Storage</option>}
                {storageLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            {/* Purchase Unit */}
            <div className="border rounded-lg p-3 space-y-2 bg-blue-50 border-blue-200">
              <Label className="text-blue-800 font-semibold">Purchase Unit (how you buy it)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600">Type</Label>
                  <select
                    value={formData.purchase_unit}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setFormData({
                        ...formData,
                        purchase_unit: nextType,
                        purchase_unit_label: formData.purchase_unit_label || (nextType === "weight" ? "kg" : "pcs"),
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1 bg-white"
                  >
                    <option value="pcs">Pieces / Count</option>
                    <option value="weight">Weight / Volume</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Unit (from Unit Table)</Label>
                  <UnitFuzzySelect
                    value={formData.purchase_unit_label}
                    unitType={formData.purchase_unit}
                    onChange={(unitCode) => setFormData({ ...formData, purchase_unit_label: unitCode })}
                    placeholder="Search unit…"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Selling Unit */}
            <div className="border rounded-lg p-3 space-y-2 bg-green-50 border-green-200">
              <Label className="text-green-800 font-semibold">Selling Unit (how you use/sell it)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600">Type</Label>
                  <select
                    value={formData.selling_unit}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setFormData({
                        ...formData,
                        selling_unit: nextType,
                        selling_unit_label: formData.selling_unit_label || (nextType === "weight" ? "kg" : "pcs"),
                      });
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-sm mt-1 bg-white"
                  >
                    <option value="pcs">Pieces / Count</option>
                    <option value="weight">Weight / Volume</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Unit (from Unit Table)</Label>
                  <UnitFuzzySelect
                    value={formData.selling_unit_label}
                    unitType={formData.selling_unit}
                    onChange={(unitCode) => setFormData({ ...formData, selling_unit_label: unitCode, unit: unitCode })}
                    placeholder="Search unit…"
                    className="mt-1"
                  />
                </div>
              </div>
              {(() => {
                const buyLabel = formData.purchase_unit_label || (formData.purchase_unit === "weight" ? "kg" : "pcs");
                const sellLabel = formData.selling_unit_label || (formData.selling_unit === "weight" ? "kg" : "pcs");
                if (!buyLabel || !sellLabel || normalizeUnit(buyLabel) === normalizeUnit(sellLabel)) return null;
                const conv = resolveConversionFactor(buyLabel, sellLabel, {
                  item: editingItem,
                  itemId: editingItem?.id,
                  rules: unitRules,
                });
                return conv.ok ? (
                  <p className="text-xs text-emerald-800 font-mono pt-1">
                    ✓ Active rule: 1 {normalizeUnit(buyLabel)} = {roundQty(conv.factor, 4)} {normalizeUnit(sellLabel)} ({conv.source})
                  </p>
                ) : (
                  <p className="text-xs text-amber-800 pt-1">
                    ⚠ No conversion rule between "{buyLabel}" and "{sellLabel}" yet — add one in Admin → Unit Conversions.
                  </p>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Stock ({formData.selling_unit_label || (formData.selling_unit === "weight" ? "kg" : "pcs")})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <LastPurchaseCostField
                formData={formData}
                latestPurchase={editingItem ? latestPurchaseByItem[editingItem.id] : null}
                onChange={(value) => setFormData({ ...formData, cost_per_unit: value })}
              />
            </div>
            <div>
              <Label>Expiry Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={formData.expiry_date || ""}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Low Stock Threshold ({formData.selling_unit_label || (formData.selling_unit === "weight" ? "kg" : "pcs")})</Label>
              <Input
                type="number"
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
              />
            </div>
            <div>
              <Label>Preferred Supplier</Label>
              <select
                value={formData.supplier_id || ""}
                onChange={(e) => {
                  const selectedSupplier = suppliers.find(s => s.id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    supplier_id: e.target.value,
                    supplier: selectedSupplier ? selectedSupplier.name : ""
                  });
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Select supplier</option>
                {suppliers.filter(s => s.is_active).map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave}>
                {editingItem ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>CSV Data (one item per line)</Label>
              <p className="text-xs text-slate-500 mb-2">
                Format: Name, Quantity, Unit, Low Stock Threshold, Cost per Unit, Supplier
              </p>
              <Textarea
                rows={10}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Tomatoes, 50, kg, 10, 2.5, ABC Supplier&#10;Lettuce, 30, kg, 5, 1.8, XYZ Farms&#10;Olive Oil, 20, L, 5, 8.5, Premium Oils"
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBulkUploadOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkUpload} disabled={bulkUploadMutation.isPending}>
                {bulkUploadMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}