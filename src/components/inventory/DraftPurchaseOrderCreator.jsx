import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { pickSupplierForItem } from '@/components/purchasing/supplierCategories';
import { assertSuppliersCoverCategories } from '@/components/purchasing/supplierCategoryGuard';
import SupplierCombobox from '@/components/purchasing/SupplierCombobox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader, TrendingUp, Plus, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DraftPurchaseOrderCreator({ forecastResults, onClose }) {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState(
    forecastResults?.recommendations?.map((_, idx) => idx) || []
  );
  const [supplierId, setSupplierId] = useState(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('name')
  });

  const targetBranchId = forecastResults?.branchId || null;

  // Fetch inventory items to get IDs
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventoryItems', targetBranchId],
    queryFn: async () => {
      const items = await base44.entities.InventoryItem.filter(
        targetBranchId ? { branch_id: targetBranchId } : {},
        '-created_date',
        1000
      );
      return items.filter(i => !targetBranchId || i.branch_id === targetBranchId);
    }
  });

  const createDraftPOsMutation = useMutation({
    mutationFn: async () => {
      const itemsToOrder = selectedItems.map(idx => forecastResults.recommendations[idx]);
      
      // Group items by supplier
      const itemsBySupplier = {};
      const fallbackBySupplier = {};
      itemsToOrder.forEach(recommendation => {
        const inventoryItem = inventoryItems.find(inv => 
          inv.name && recommendation.itemName && 
          inv.name.toLowerCase().includes(recommendation.itemName.toLowerCase())
        );

        if (!inventoryItem) return;

        const pick = pickSupplierForItem(inventoryItem, suppliers);
        const supplier = supplierId || pick.supplierId || 'general';
        if (!itemsBySupplier[supplier]) {
          itemsBySupplier[supplier] = [];
        }
        if (!supplierId && pick.fallback) {
          (fallbackBySupplier[supplier] ||= []).push(inventoryItem.name);
        }

        itemsBySupplier[supplier].push({
          inventory_item_id: inventoryItem.id,
          inventory_item_name: inventoryItem.name,
          category_id: inventoryItem.category_id,
          category_name: inventoryItem.category_name,
          quantity_ordered: Math.round(recommendation.recommendedQuantity),
          purchase_unit: inventoryItem.purchase_unit || 'pcs',
          purchase_unit_label: inventoryItem.purchase_unit_label || (inventoryItem.purchase_unit === 'weight' ? 'kg' : 'pcs'),
          selling_unit: inventoryItem.selling_unit || 'pcs',
          selling_unit_label: inventoryItem.selling_unit_label || (inventoryItem.selling_unit === 'weight' ? 'kg' : 'pcs'),
          unit_price: inventoryItem.cost_per_unit || 0,
          total_price: (inventoryItem.cost_per_unit || 0) * Math.round(recommendation.recommendedQuantity)
        });
      });

      // Every line's supplier must be tagged for the item's category — checked before anything is created.
      await assertSuppliersCoverCategories(Object.entries(itemsBySupplier).flatMap(([supplier, items]) =>
        items.map((i) => ({ ...i, supplier_id: supplier === 'general' ? '' : supplier, supplier_name: suppliers.find((s) => s.id === supplier)?.name }))));

      // Create draft POs for each supplier
      const createdPOs = [];
      for (const [supplier, items] of Object.entries(itemsBySupplier)) {
        const supplierInfo = suppliers.find(s => s.id === supplier) || 
                            { name: supplier || 'General Supplier', id: supplier };
        
        const totalAmount = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

        const po = await base44.entities.PurchaseOrder.create({
          order_number: `PO-DRAFT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          branch_id: forecastResults.branchId,
          branch_name: forecastResults.branchName,
          supplier_id: supplier,
          supplier: supplierInfo.name || 'General Supplier',
          supplier_contact: supplierInfo.contact_person || supplierInfo.phone || '',
          order_date: new Date().toISOString().split('T')[0],
          expected_delivery_date: new Date(Date.now() + forecastResults.leadTime * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: items,
          total_amount: totalAmount,
          status: 'pending_approval',
          notes: [
            orderNotes ? `Draft from Forecasting Tool. ${orderNotes}` : 'Draft from Forecasting Tool',
            fallbackBySupplier[supplier] ? `No supplier tagged for the category of: ${fallbackBySupplier[supplier].join(', ')} — kept preferred supplier.` : ''
          ].filter(Boolean).join(' ')
        });

        createdPOs.push(po);
      }

      return createdPOs;
    },
    onSuccess: (createdPOs) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success(`Created ${createdPOs.length} draft purchase order(s)`);
      onClose?.();
    },
    onError: (error) => {
      toast.error('Failed to create purchase orders: ' + error.message);
    }
  });

  const handleCreateDrafts = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    setIsCreating(true);
    try {
      await createDraftPOsMutation.mutateAsync();
    } finally {
      setIsCreating(false);
    }
  };

  const toggleItem = (idx) => {
    setSelectedItems(prev =>
      prev.includes(idx)
        ? prev.filter(i => i !== idx)
        : [...prev, idx]
    );
  };

  const toggleAllItems = () => {
    if (selectedItems.length === forecastResults?.recommendations?.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(forecastResults?.recommendations?.map((_, idx) => idx) || []);
    }
  };

  const selectedRecommendations = selectedItems.map(idx => forecastResults.recommendations[idx]);
  const estimatedCost = selectedRecommendations.reduce((sum, rec) => {
    const inventoryItem = inventoryItems.find(inv => 
      inv.name && rec.itemName && 
      inv.name.toLowerCase().includes(rec.itemName.toLowerCase())
    );
    return sum + ((inventoryItem?.cost_per_unit || 0) * rec.recommendedQuantity);
  }, 0);

  return (
    <Dialog open={!!forecastResults} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create Draft Purchase Orders
          </DialogTitle>
          <DialogDescription>
            Review and select items from the forecast to create draft purchase orders ready for approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supplier Selection */}
          <div>
            <Label className="text-sm font-medium">Group by Supplier (Optional)</Label>
            <p className="text-xs text-slate-500 mb-2">Leave blank to use each item's preferred supplier</p>
            <SupplierCombobox
              className="w-full"
              value={supplierId || ""}
              placeholder="Use default suppliers for each item"
              options={[
                { value: "", label: "Use item's default supplier" },
                ...suppliers.filter(s => s.is_active).map(s => ({ value: s.id, label: s.name, sub: s.phone || s.email || "" }))
              ]}
              onChange={(val) => setSupplierId(val || null)}
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium">Notes (Optional)</Label>
            <Input
              placeholder="Add any notes to the PO (e.g., special instructions, delivery preferences)"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />
          </div>

          {/* Items Selection */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Items to Order</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllItems}
                  className="text-xs"
                >
                  {selectedItems.length === forecastResults?.recommendations?.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {forecastResults?.recommendations?.map((item, idx) => {
                  const inventoryItem = inventoryItems.find(inv => 
                    inv.name && item.itemName && 
                    inv.name.toLowerCase().includes(item.itemName.toLowerCase())
                  );
                  const cost = (inventoryItem?.cost_per_unit || 0) * item.recommendedQuantity;

                  return (
                    <div key={idx} className="flex items-start gap-3 p-2 rounded hover:bg-slate-50">
                      <Checkbox
                        checked={selectedItems.includes(idx)}
                        onCheckedChange={() => toggleItem(idx)}
                        className="mt-1"
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium text-slate-900">{item.itemName}</div>
                        <div className="text-xs text-slate-500 space-y-1 mt-1">
                          <div>
                            Current: {item.currentStock} | Avg Daily: {item.avgDailySales.toFixed(1)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span>
                              Order: <span className="font-semibold text-blue-600">{Math.round(item.recommendedQuantity)} {inventoryItem?.purchase_unit_label || 'units'}</span>
                            </span>
                            {cost > 0 && (
                              <span className="text-slate-600">
                                ≈ EGP {cost.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">Items Selected:</span>
                <span className="font-semibold">{selectedItems.length} of {forecastResults?.recommendations?.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Estimated Cost:</span>
                <span className="font-semibold text-blue-600">EGP {estimatedCost.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Forecast Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 mb-1">Forecast Parameters:</p>
                <p>Lead time: {forecastResults.leadTime} days • Safety stock: {forecastResults.safetyDays} days</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDrafts}
              disabled={isCreating || selectedItems.length === 0}
              className="gap-2"
            >
              {isCreating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create {selectedItems.length > 0 ? `${Math.ceil(selectedItems.length / 2)}-${selectedItems.length}` : '0'} Draft PO(s)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}