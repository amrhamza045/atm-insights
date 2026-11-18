import React, { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import ChunkErrorBoundary from "@/components/ChunkErrorBoundary";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Lightbulb, ClipboardCheck, FileCheck2, Receipt, TrendingUp, ShieldCheck, Truck, ChefHat } from "lucide-react";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import useTabTrail from "@/lib/useTabTrail";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import PurchasingStageNav from "@/components/purchasing/PurchasingStageNav";

const PurchaseOrderManager = lazy(() => import("@/components/admin/PurchaseOrderManager"));
const POAdvisory = lazy(() => import("@/components/admin/POAdvisory"));
const SupplierReliabilityDashboard = lazy(() => import("@/components/admin/SupplierReliabilityDashboard"));
const PurchaseInvoiceManager = lazy(() => import("@/components/admin/PurchaseInvoiceManager"));
const AveragePurchasePrices = lazy(() => import("@/components/admin/AveragePurchasePrices"));
const SupplierPriceAdvisory = lazy(() => import("@/components/admin/SupplierPriceAdvisory"));
const SupplierManagement = lazy(() => import("@/components/admin/SupplierManagement"));
const RecommendedCartPanel = lazy(() => import("@/components/purchasing/cart/RecommendedCartPanel"));
const KitchenRequestsPanel = lazy(() => import("@/components/purchasing/KitchenRequestsPanel"));

// Ordered by the real purchasing lifecycle: plan → advise → order → receive → analyse → suppliers
const STAGES = [
  { key: "recommended-cart", label: "Recommended Cart", component: RecommendedCartPanel, icon: ShoppingCart },
  { key: "kitchen-requests", label: "Kitchen Requests", component: KitchenRequestsPanel, icon: ChefHat },
  { key: "purchase-orders", label: "Purchase Orders", component: PurchaseOrderManager, icon: ClipboardCheck },
  { key: "invoices", label: "Purchase Invoices", component: PurchaseInvoiceManager, icon: FileCheck2 },
  { key: "avg-prices", label: "Average Prices", component: AveragePurchasePrices, icon: Receipt },
  { key: "price-advisory", label: "Price Advisory", component: SupplierPriceAdvisory, icon: TrendingUp },
  { key: "supplier-reliability", label: "Reliability", component: SupplierReliabilityDashboard, icon: ShieldCheck },
  { key: "suppliers", label: "Suppliers", component: SupplierManagement, icon: Truck },
  { key: "po-advisory", label: "PO Advisory", component: POAdvisory, icon: Lightbulb },
];

export default function PurchasesHub() {
  const { permissions, currentUser } = usePermissions();
  const { isModuleEnabled } = useModuleAccess();
  // Stages closed in Admin › Modules (supplier stages also follow Suppliers) are left out.
  const stages = useScreenTabs("PurchasesHub").keep(STAGES);
  const [activeStage, setActiveStage] = useTabTrail(stages, { param: "stage" });
  const isAdmin = useIsAdmin();
  const canAccess = isAdmin || permissions?.purchase_view || permissions?.purchase_edit;

  if (!currentUser || (!isAdmin && permissions === undefined)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!canAccess || !isModuleEnabled('purchases')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600">You don't have permission to access Purchases.</p>
        </Card>
      </div>
    );
  }

  const ActiveComponent = stages.find((s) => s.key === activeStage)?.component;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Purchases</h1>
            <p className="text-sm text-slate-500">Full purchasing lifecycle: recommendation to received invoice</p>
          </div>
        </div>

        {ActiveComponent ? (
          <>
            <PurchasingStageNav stages={stages} activeKey={activeStage} onChange={setActiveStage} />
            <ChunkErrorBoundary resetKey={activeStage}>
              <Suspense fallback={<div role="status" className="p-6 text-sm text-slate-500">Loading Purchasing stage…</div>}>
                <ActiveComponent />
              </Suspense>
            </ChunkErrorBoundary>
          </>
        ) : <ClosedTabsNotice />}
      </div>
    </div>
  );
}