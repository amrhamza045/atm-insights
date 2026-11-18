import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import useBranchInventory from "@/components/inventory/useBranchInventory";

export default function LowStockDashboard() {
  const { data: inventory = [] } = useBranchInventory();

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list()
  });

  const lowStockItems = inventory.filter(
    (item) => item.quantity <= (item.low_stock_threshold || 10)
  );

  const criticalItems = lowStockItems.filter(
    (item) => item.quantity <= (item.low_stock_threshold || 10) * 0.5
  );

  const lowStockByCategory = lowStockItems.reduce((acc, item) => {
    const catName = item.category_name || "Uncategorized";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(item);
    return acc;
  }, {});

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="border-warning-200 bg-warning-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-600" />
            Low Stock Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-warning-600">{lowStockItems.length}</p>
            <p className="text-sm text-slate-600">Items below threshold</p>
          </div>
          <div className="space-y-2">
            {Object.entries(lowStockByCategory).map(([category, items]) => (
              <div key={category} className="flex justify-between items-center text-sm">
                <span className="text-slate-700">{category}</span>
                <Badge variant="outline" className="border-warning-300">
                  {items.length} items
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5 text-red-600" />
            Critical Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-red-600">{criticalItems.length}</p>
            <p className="text-sm text-slate-600">Below 50% threshold</p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {criticalItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-white rounded border border-red-200">
                <span className="text-slate-700 font-medium">{item.name}</span>
                <span className="text-red-600 font-bold">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}