import { Card } from "@/components/ui/card";
import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { QueryClientProvider } from "@tanstack/react-query";
import { reportQueryClient } from "@/components/executive/reportQueryClient";
import { useBranch } from "@/components/branches/BranchContext";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import DashboardGroupNav from "@/components/executive/DashboardGroupNav";
import useExecutiveTrail from "@/components/executive/useExecutiveTrail";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { BarChart3 } from "lucide-react";
const PnlReport = lazy(() => import('@/components/executive/financial/PnlReport'));
const RevenueReport = lazy(() => import('@/components/executive/financial/RevenueReport'));
const CostsReport = lazy(() => import('@/components/executive/financial/CostsReport'));
const CashReport = lazy(() => import('@/components/executive/financial/CashReport'));
const BranchesReport = lazy(() => import('@/components/executive/financial/BranchesReport'));
const LaborReport = lazy(() => import('@/components/executive/people/labor/LaborReport'));
const AttendanceReport = lazy(() => import('@/components/executive/people/attendance/AttendanceReport'));
const WorkforceReport = lazy(() => import('@/components/executive/people/workforce/WorkforceReport'));
const StockWasteReport = lazy(() => import('@/components/executive/supply/stock/StockWasteReport'));
const PurchasingReport = lazy(() => import('@/components/executive/supply/purchasing/PurchasingReport'));
const SuppliersReport = lazy(() => import('@/components/executive/supply/suppliers/SuppliersReport'));
const DishPerformanceReport = lazy(() => import('@/components/executive/supply/dishes/DishPerformanceReport'));
const KitchenReport = lazy(() => import('@/components/executive/supply/kitchen/KitchenReport'));
const LeadsReport = lazy(() => import('@/components/executive/customers/leads/LeadsReport'));
const ClientsReport = lazy(() => import('@/components/executive/customers/clients/ClientsReport'));
const CareReport = lazy(() => import('@/components/executive/customers/care/CareReport'));
const AiInsightsReport = lazy(() => import('@/components/executive/insights/ai/AiInsightsReport'));
const AlertsReport = lazy(() => import('@/components/executive/insights/alerts/AlertsReport'));
const OutlookReport = lazy(() => import('@/components/executive/insights/outlook/OutlookReport'));
const OverviewPage = lazy(() => import('@/components/executive/overview/OverviewPage'));
const EventPnlReport = lazy(() => import('@/components/executive/catering/pnl/EventPnlReport'));
const PipelineReport = lazy(() => import('@/components/executive/catering/pipeline/PipelineReport'));
const StaffingReport = lazy(() => import('@/components/executive/catering/staffing/StaffingReport'));
const EquipmentReport = lazy(() => import('@/components/executive/catering/equipment/EquipmentReport'));
const LossReport = lazy(() => import('@/components/executive/catering/loss/LossReport'));
const CostVarianceReport = lazy(() => import('@/components/executive/catering/costVariance/CostVarianceReport'));
const FeedbackReport = lazy(() => import('@/components/executive/catering/feedback/FeedbackReport'));
const AdvisorReport = lazy(() => import('@/components/executive/catering/advisor/AdvisorReport'));
import { CateringFilterProvider } from "@/components/executive/catering/CateringFilterContext";
import VenueFilterBar from "@/components/executive/catering/VenueFilterBar";
import ReportPeriodBar from "@/components/executive/period/ReportPeriodBar";

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-2xl">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400 truncate">{label}</p>
          <p className="text-lg font-bold text-slate-900 truncate">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default function ExecutiveDashboard() {
  // Report group and report live in the address (Back / Forward / Recent / refresh).
  const { ready, groups, activeGroup, activeTab, activeReport, setActiveTab } = useExecutiveTrail();
  // Every report follows the header picker; each selection keeps its own report cache.
  const { reportScopeKey, scopeReady } = useBranch();

  return (
    <QueryClientProvider key={reportScopeKey} client={reportQueryClient(reportScopeKey)}>
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            Executive Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Business overview of every module that is switched on</p>
        </div>


        {!ready || !scopeReady ? (
          <p role="status" className="py-6 text-sm text-muted-foreground">Loading the dashboard…</p>
        ) : !activeTab ? <ClosedTabsNotice /> : (
        <CateringFilterProvider>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <DashboardGroupNav groups={groups} activeGroup={activeGroup} activeTab={activeTab} onTabChange={setActiveTab} />

          {activeReport?.filter === "catering" && <VenueFilterBar dateControl={activeReport.period ? false : undefined} />}
          {activeReport?.period && <ReportPeriodBar budget={activeReport.budget !== false} />}

          <Suspense fallback={<p role="status" className="py-6 text-sm text-muted-foreground">Loading selected report…</p>}>
          <TabsContent value="summary"><OverviewPage /></TabsContent>
          <TabsContent value="pnl"><PnlReport /></TabsContent>
          <TabsContent value="revenue"><RevenueReport /></TabsContent>
          <TabsContent value="costs"><CostsReport /></TabsContent>
          <TabsContent value="cash"><CashReport /></TabsContent>
          <TabsContent value="branches"><BranchesReport /></TabsContent>
          <TabsContent value="pipeline"><PipelineReport /></TabsContent>
          <TabsContent value="cateringstaffing"><StaffingReport /></TabsContent>
          <TabsContent value="cateringequipment"><EquipmentReport /></TabsContent>
          <TabsContent value="lossanalysis"><LossReport /></TabsContent>
          <TabsContent value="costvariance"><CostVarianceReport /></TabsContent>
          <TabsContent value="clientfeedback"><FeedbackReport /></TabsContent>
          <TabsContent value="advisor"><AdvisorReport /></TabsContent>
          <TabsContent value="catering"><EventPnlReport /></TabsContent>
          <TabsContent value="stockwaste"><StockWasteReport /></TabsContent>
          <TabsContent value="dishes"><DishPerformanceReport /></TabsContent>
          <TabsContent value="kitchen"><KitchenReport /></TabsContent>
          <TabsContent value="labor"><LaborReport /></TabsContent>
          <TabsContent value="attendance"><AttendanceReport /></TabsContent>
          <TabsContent value="workforce"><WorkforceReport /></TabsContent>
          <TabsContent value="purchasing"><PurchasingReport /></TabsContent>
          <TabsContent value="suppliers"><SuppliersReport /></TabsContent>
          <TabsContent value="leads"><LeadsReport /></TabsContent>
          <TabsContent value="clients"><ClientsReport /></TabsContent>
          <TabsContent value="care"><CareReport /></TabsContent>
          <TabsContent value="ai"><AiInsightsReport /></TabsContent>
          <TabsContent value="alerts"><AlertsReport /></TabsContent>
          <TabsContent value="predict"><OutlookReport /></TabsContent>
          </Suspense>
        </Tabs>
        </CateringFilterProvider>
        )}
      </div>
    </div>
    </QueryClientProvider>
  );
}