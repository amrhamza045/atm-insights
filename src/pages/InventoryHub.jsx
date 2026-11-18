import React, { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import ChunkErrorBoundary from "@/components/ChunkErrorBoundary";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Package, TrendingUp, PoundSterling, Trash2, Boxes, AlertTriangle, ChefHat } from "lucide-react";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import useTabTrail from "@/lib/useTabTrail";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";

const KitchenCustodyView = lazy(() => import("@/components/inventory/kitchenCustody/KitchenCustodyView"));
const ExpiryReportsPanel = lazy(() => import("@/components/expiry/ExpiryReportsPanel"));
const InventoryManagement = lazy(() => import("@/pages/InventoryManagement"));
const InventoryForecastingTool = lazy(() => import("@/components/admin/InventoryForecastingTool"));
const CostAnalysisDashboard = lazy(() => import("@/components/admin/CostAnalysisDashboard"));
const WasteDeclarationManager = lazy(() => import("@/components/admin/WasteDeclarationManager"));
const PartialStockReviewSettings = lazy(() => import("@/components/admin/PartialStockReviewSettings"));
const LowStockSettings = lazy(() => import("@/components/admin/LowStockSettings"));
const LowStockDashboard = lazy(() => import("@/components/inventory/LowStockDashboard"));
const StockReview = lazy(() => import("@/components/inventory/StockReview"));
const ReinitiateStock = lazy(() => import("@/components/inventory/ReinitiateStock"));

const INVENTORY_TABS = [
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "cost-analysis", label: "Cost Analysis", icon: PoundSterling },
  { key: "waste", label: "Waste", icon: Trash2 },
  { key: "expiry", label: "Expiry", icon: AlertTriangle },
  { key: "kitchen-custody", label: "Kitchen Custody", icon: ChefHat },
  { key: "stock-admin", label: "Stock Admin", icon: Boxes },
  { key: "inventory-forecast", label: "Forecast", icon: TrendingUp },
];

export default function InventoryHub() {
  const { permissions, currentUser } = usePermissions();
  const { isModuleEnabled } = useModuleAccess();
  const isAdmin = useIsAdmin();
  const canAccess = isAdmin || permissions?.inventory_view || permissions?.inventory_edit;
  // Tabs closed in Admin › Modules (Cost Analysis and Expiry also follow their own modules).
  const tabs = useScreenTabs("InventoryHub").keep(INVENTORY_TABS);
  const [tab, setTab] = useTabTrail(tabs);

  if (!currentUser || (!isAdmin && permissions === undefined)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!canAccess || !isModuleEnabled('inventory')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600">You don't have permission to access Inventory.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            Inventory
          </h1>
          <p className="text-slate-500 mt-1">Stock, costs, waste and forecasting</p>
        </div>

        {tabs.length === 0 ? <ClosedTabsNotice /> : (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="border shadow-sm w-full h-auto flex-wrap justify-start bg-orange-50">
            {tabs.map(({ key, label, icon: Icon }) => (
              <TabsTrigger key={key} value={key} className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                <Icon className="w-4 h-4" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ChunkErrorBoundary resetKey={tab}>
          <Suspense fallback={<div role="status" className="p-6 text-sm text-slate-500">Loading Inventory section…</div>}>
          <TabsContent value="inventory">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="cost-analysis">
            <CostAnalysisDashboard />
          </TabsContent>

          <TabsContent value="waste">
            <WasteDeclarationManager />
          </TabsContent>

          <TabsContent value="expiry">
            <ExpiryReportsPanel />
          </TabsContent>

          <TabsContent value="kitchen-custody">
            <KitchenCustodyView />
          </TabsContent>

          <TabsContent value="stock-admin" className="space-y-4">
            <Tabs defaultValue="stock-balance" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="stock-balance">Stock Balance</TabsTrigger>
                <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
                <TabsTrigger value="stock-freeze">Stock Freeze</TabsTrigger>
                <TabsTrigger value="low-stock-alerts">Low Stock Alerts</TabsTrigger>
                <TabsTrigger value="reinitiate-stock">Reinitiate Stock</TabsTrigger>
              </TabsList>

              <TabsContent value="stock-balance" className="mt-4">
                <StockReview />
              </TabsContent>

              <TabsContent value="low-stock" className="mt-4 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">Low Stock Overview</h2>
                  <p className="text-sm text-slate-500">Monitor items that need reordering</p>
                </div>
                <LowStockDashboard />
              </TabsContent>

              <TabsContent value="stock-freeze" className="mt-4 space-y-6">
                <PartialStockReviewSettings />
              </TabsContent>

              <TabsContent value="low-stock-alerts" className="mt-4 space-y-6">
                <LowStockSettings />
              </TabsContent>

              <TabsContent value="reinitiate-stock" className="mt-4">
                <ReinitiateStock />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="inventory-forecast" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Inventory Forecasting</h2>
              <p className="text-sm text-slate-500">Analyze sales trends and stock levels to get intelligent restocking recommendations</p>
            </div>
            <InventoryForecastingTool />
          </TabsContent>
          </Suspense>
          </ChunkErrorBoundary>
        </Tabs>
        )}
      </div>
    </div>
  );
}