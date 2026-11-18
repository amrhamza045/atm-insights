import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ShoppingCart, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { readableOrderNumber } from "@/components/purchasing/orderNumber";
import { assertOrderSupplierCovers } from "@/components/purchasing/supplierCategoryGuard";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function LowStockPurchaseOrders() {
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState({});

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventoryItems"],
    queryFn: () => base44.entities.InventoryItem.list("-created_date")
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("name")
  });

  const lowStockItems = inventory.filter(
    (item) => item.quantity <= (item.low_stock_threshold || 10)
  );

  const createPOMutation = useMutation({
    mutationFn: async (orderData) => {
      await assertOrderSupplierCovers(orderData.supplier_id, orderData.supplier, orderData.items);
      return await base44.entities.PurchaseOrder.create(orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("Purchase order created");
      setSelectedItems({});
    },
    onError: (e) => toast.error(e.message)
  });

  const handleQuantityChange = (itemId, quantity) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity_ordered: parseFloat(quantity) || 0
      }
    }));
  };

  const handleToggleItem = (item) => {
    if (selectedItems[item.id]) {
      const newSelected = { ...selectedItems };
      delete newSelected[item.id];
      setSelectedItems(newSelected);
    } else {
      const suggestedQuantity = (item.low_stock_threshold || 10) * 3 - item.quantity;
      setSelectedItems((prev) => ({
        ...prev,
        [item.id]: {
          inventory_item_id: item.id,
          inventory_item_name: item.name,
          quantity_ordered: Math.max(suggestedQuantity, 10),
          unit: item.unit,
          unit_price: item.cost_per_unit || 0,
          total_price: (item.cost_per_unit || 0) * Math.max(suggestedQuantity, 10)
        }
      }));
    }
  };

  const handleCreatePurchaseOrder = () => {
    const items = Object.values(selectedItems);
    if (items.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    // Group by supplier or category
    const firstItem = inventory.find(i => i.id === items[0].inventory_item_id);
    const supplier = suppliers.find(s => s.id === firstItem?.supplier_id);

    const orderNumber = readableOrderNumber({ prefix: "PO-LOW", supplierName: supplier?.name || "Multiple Suppliers" });
    const totalAmount = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

    const orderData = {
      order_number: orderNumber,
      items: items.map(item => ({
        ...item,
        total_price: item.quantity_ordered * item.unit_price
      })),
      supplier_id: supplier?.id,
      supplier: supplier?.name || "Multiple Suppliers",
      supplier_contact: supplier?.phone,
      order_date: new Date().toISOString().split('T')[0],
      total_amount: totalAmount,
      status: "pending",
      notes: "Auto-generated from low stock alerts"
    };

    createPOMutation.mutate(orderData);
  };

  if (lowStockItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">No low stock items at the moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Low Stock Items - Create Purchase Order
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              {lowStockItems.length} items below threshold
            </p>
          </div>
          {Object.keys(selectedItems).length > 0 && (
            <Button onClick={handleCreatePurchaseOrder} disabled={createPOMutation.isPending}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Create PO ({Object.keys(selectedItems).length} items)
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lowStockItems.map((item) => {
            const isSelected = !!selectedItems[item.id];
            const selectedQty = selectedItems[item.id]?.quantity_ordered || 0;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{item.name}</h4>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        {item.quantity} {item.unit} remaining
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>Threshold: {item.low_stock_threshold || 10} {item.unit}</p>
                      {item.supplier && <p>Supplier: {item.supplier}</p>}
                      {item.cost_per_unit && (
                        <p>Cost: {formatCurrency(item.cost_per_unit)}/{item.unit}</p>
                      )}
                    </div>

                    {isSelected && (
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-sm font-medium">Order Quantity:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleQuantityChange(item.id, selectedQty - 10)
                            }
                            disabled={selectedQty <= 10}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            value={selectedQty}
                            onChange={(e) =>
                              handleQuantityChange(item.id, e.target.value)
                            }
                            className="w-24 text-center"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleQuantityChange(item.id, selectedQty + 10)
                            }
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm text-slate-600">{item.unit}</span>
                        </div>
                        {item.cost_per_unit && (
                          <span className="ml-auto font-semibold">
                            Total: {formatCurrency(selectedQty * item.cost_per_unit)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => handleToggleItem(item)}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}