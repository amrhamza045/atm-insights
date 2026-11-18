import { useState, useEffect } from "react";
import { companyToday } from "@/components/utils/timezoneHelper";
import { base44 } from "@/api/base44Client";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import useTabTrail from "@/lib/useTabTrail";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { BarChart3 } from "lucide-react";
import FBAnalyticsDashboard from "@/components/admin/FBAnalyticsDashboard";
import AllSalesFinancials from "@/components/admin/AllSalesFinancials";
import DirectFinancials from "@/components/admin/DirectFinancials";
import DeliveryCompanyFinancials from "@/components/admin/DeliveryCompanyFinancials";
import DailySalesReport from "@/components/admin/DailySalesReport";
import MonthlySalesReport from "@/components/admin/MonthlySalesReport";
import DiscountAuditLog from "@/components/admin/DiscountAuditLog";
import ItemSalesAnalysis from "@/components/admin/ItemSalesAnalysis";
import RestaurantLogo from "@/components/RestaurantLogo";

export default function Sales() {
  // Tabs closed in Admin › Modules are left out.
  const tabs = useScreenTabs("Sales").keep([
    { key: "all", label: "All Sales" },
    { key: "monthly-report", label: "Monthly Report" },
    { key: "fnb", label: "F&B Analytics" },
    { key: "direct", label: "Direct" },
    { key: "delivery-companies", label: "Delivery Companies" },
    { key: "daily-report", label: "Daily Report" },
    { key: "discount-audit", label: "Discount Audit" },
    { key: "item-analysis", label: "Item Analysis" },
  ]);
  const [activeTab, setActiveTab] = useTabTrail(tabs, { fallback: "fnb" });
  const [startDate, setStartDate] = useState(companyToday().slice(0, 8) + "01");
  const [endDate, setEndDate] = useState(companyToday());
  const navigate = useNavigate();

  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    // Wait until both currentUser and permissions are loaded before checking access
    if (!currentUser || !permissions) return;
    const canAccess = isAdmin || permissions?.sales_view;
    if (!canAccess) {
      navigate('/');
    }
  }, [permissions, currentUser, isAdmin, navigate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RestaurantLogo className="h-9" />
              <BarChart3 className="w-6 h-6 text-slate-700" />
              <div>
                <CardTitle>POS / Counter Sales</CardTitle>
                <CardDescription>Counter-sales reporting only — catering revenue and P&L live in the Executive Dashboard</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {tabs.length === 0 ? <ClosedTabsNotice /> : (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="all" className="space-y-6 mt-4">
          <AllSalesFinancials startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="monthly-report" className="space-y-6 mt-4">
          <MonthlySalesReport />
        </TabsContent>

        <TabsContent value="fnb" className="space-y-6 mt-4">
          <FBAnalyticsDashboard startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="direct" className="space-y-6 mt-4">
          <DirectFinancials startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="delivery-companies" className="space-y-6 mt-4">
          <DeliveryCompanyFinancials startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="daily-report" className="space-y-6 mt-4">
          <DailySalesReport startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="discount-audit" className="space-y-6 mt-4">
          <DiscountAuditLog />
        </TabsContent>

        <TabsContent value="item-analysis" className="space-y-6 mt-4">
          <ItemSalesAnalysis startDate={startDate} endDate={endDate} />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}