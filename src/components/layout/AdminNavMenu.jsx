import React from "react";
import { Link } from "react-router-dom";
import { ALL_APPROVAL_KEYS } from "@/components/approvals/approvalPermissions";
import { Button } from "@/components/ui/button";
import {
  UserCircle,
  BarChart3,
  ChefHat,
  Navigation,
  Users,
  Check,
  History,
  ShoppingCart,
  Settings,
  LayoutGrid,
  BookOpen,
  PoundSterling,
  Factory,
  Beef,
  PartyPopper,
  Package,
  Home,
  Coins,
  UtensilsCrossed,
  Wallet,
  Receipt,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import HelpNavMenu from "@/components/layout/HelpNavMenu";
import NavDropdown from "@/components/layout/NavDropdown";
import { permissionsForRoute } from "@/lib/routePermissionMap";

export default function AdminNavMenu({ t }) {
  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();
  // isRouteOpen is the same rule the page itself uses, so a closed module's
  // link disappears together with its page.
  const { isModuleEnabled, isRouteOpen } = useModuleAccess();

  // Permission checks — isAdmin short-circuits to true, preserving full admin visibility
  const canAccessKDS = isAdmin || permissions?.kds_view;
  const canAccessKDSBar = isAdmin || permissions?.kds_bar_view;
  const canAccessAnyKDS = canAccessKDS || canAccessKDSBar;
  const canAccessDelivery = isAdmin || permissions?.delivery_view;
  const canAccessAttendance = isAdmin || permissions?.attendance_checkin || permissions?.hr_view_own;
  const canAccessApprovals = isAdmin || ALL_APPROVAL_KEYS.some((k) => permissions?.[k]);

  // Marketing Team is CRM-only
  const canAccessCRM = isAdmin || permissions?.crm_full_view || permissions?.clients_view;
  const canAccessManufacturing = isAdmin || permissions?.manufacturing_view || permissions?.manufacturing_edit;
  const canAccessButchery = isAdmin || permissions?.butchery_view || permissions?.butchery_edit;
  const canAccessCatering = isAdmin || permissions?.catering_view;
  const canAccessExecDashboard = isAdmin || permissions?.analytics_view || permissions?.financial_view;
  const canAccessSales = isAdmin || permissions?.sales_view;
  const canAccessCashbackHistory = isAdmin || permissions?.analytics_view || permissions?.financial_view;
  // Client Analytics sits in the Analytics menu but shows the client base, so it
  // needs BOTH the analytics gate its siblings use AND clients_view.
  const canAccessClientAnalytics = isAdmin || ((permissions?.analytics_view || permissions?.financial_view) && permissions?.clients_view);
  // Support Customization is an Admin tab, so its permission alone also opens Admin.
  const canAccessAdmin = isAdmin || permissions?.admin_settings || permissions?.admin_operations || permissions?.admin_systems
    || (permissions?.support_customization === true && isModuleEnabled("support_customization"));
  const canAccessInventory = isAdmin || permissions?.inventory_view || permissions?.inventory_edit;
  const canAccessPurchases = isAdmin || permissions?.purchase_view || permissions?.purchase_edit;
  const canAccessHR = isAdmin || permissions?.hr_view_all === true || permissions?.hr_edit === true;
  const canAccessCashier = isAdmin || permissions?.cashier_view;
  const canAccessFinance = isAdmin || permissions?.financial_view;
  const canAccessPettyCashCustody = isAdmin || permissionsForRoute("PettyCashCustody").some((k) => permissions?.[k]);
  const canAccessExpensesModule = isAdmin || permissionsForRoute("Expenses").some((k) => permissions?.[k]);
  // Same gate as the Menu Management screen itself (it used to be an Admin › Operations tab).
  const canAccessMenu = isAdmin || permissionsForRoute("MenuManagement").some((k) => permissions?.[k]);

  // The manual only shows next to other Operations links.
  const operationsItems = [
    { show: canAccessAnyKDS && isRouteOpen("KitchenDisplay"), to: createPageUrl("KitchenDisplay"), icon: ChefHat, label: "Kitchen Display (KDS)" },
    { show: canAccessDelivery && isRouteOpen("DeliveryPortal"), to: "/DeliveryPortal", icon: Navigation, label: "Delivery Portal" },
    { show: canAccessAttendance && isRouteOpen("EmployeeAttendance"), to: createPageUrl("EmployeeAttendance"), icon: Users, label: "Attendance" },
    { show: canAccessHR && isRouteOpen("OperationalMeetings"), to: "/OperationalMeetings", icon: Users, label: "Operational Meetings" },
    { show: canAccessApprovals && isRouteOpen("Approvals"), to: createPageUrl("Approvals"), icon: Check, label: "Approvals" },
    { show: canAccessCRM && isRouteOpen("CRM"), to: "/CRM", icon: Users, label: "CRM" },
    { show: canAccessManufacturing && isRouteOpen("Manufacturing"), to: "/Manufacturing", icon: Factory, label: "Manufacturing" },
    { show: canAccessButchery && isRouteOpen("Butchery"), to: "/Butchery", icon: Beef, label: "Butchery" },
    { show: canAccessCashier && isRouteOpen("Cashier"), to: "/Cashier", icon: PoundSterling, label: "Cashier" },
    { show: canAccessFinance && isRouteOpen("Finance"), to: "/Finance", icon: PoundSterling, label: "Finance" },
    { show: canAccessPettyCashCustody && isRouteOpen("PettyCashCustody"), to: "/PettyCashCustody", icon: Wallet, label: "Petty Cash & Custody" },
    { show: canAccessExpensesModule && isRouteOpen("Expenses"), to: "/Expenses", icon: Receipt, label: "Expenses" },
    { show: canAccessCatering && isRouteOpen("AssetsResources"), to: "/AssetsResources", icon: Coins, label: "Assets and Resources" },
    { show: canAccessMenu && isRouteOpen("MenuManagement"), to: "/MenuManagement", icon: UtensilsCrossed, label: "Menu Management" },
    { show: canAccessInventory && isRouteOpen("InventoryHub"), to: "/InventoryHub", icon: Package, label: "Inventory" },
    { show: canAccessPurchases && isRouteOpen("PurchasesHub"), to: "/PurchasesHub", icon: ShoppingCart, label: "Purchases" },
    { show: canAccessHR && isRouteOpen("HRHub"), to: "/HRHub", icon: Users, label: "HR" },
    { show: isRouteOpen("KitchenBarManual"), extra: true, separated: true, to: "/KitchenBarManual", icon: BookOpen, label: "Kitchen & Bar Manual", iconClass: "text-[#7c3030]", textClass: "font-semibold text-[#7c3030]" },
  ];

  // Menu Engineering and Butchery Analytics are restaurant-only and no longer surfaced here (routes stay reachable by URL).
  const analyticsItems = [
    { show: canAccessExecDashboard && isRouteOpen("ExecutiveDashboard"), to: "/ExecutiveDashboard", icon: BarChart3, label: "Executive Dashboard", iconClass: "text-amber-600", textClass: "font-medium" },
    { show: canAccessSales && isRouteOpen("Sales"), to: "/Sales", icon: ShoppingCart, label: "POS / Counter Sales" },
    { show: canAccessCashbackHistory && isRouteOpen("CashbackHistory"), to: createPageUrl("CashbackHistory"), icon: History, label: "Cashback History" },
    { show: canAccessClientAnalytics && isRouteOpen("ClientAnalytics"), to: "/ClientAnalytics", icon: Users, label: "Client Analytics" },
    { show: canAccessManufacturing && isRouteOpen("ManufacturingAnalytics"), to: "/ManufacturingAnalytics", icon: Factory, label: "Manufacturing Analytics" },
  ];

  return (
    <>
      {/* Profile */}
      {isModuleEnabled('my_profile') && (
      <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2.5">
        <Link to={createPageUrl("MyProfile")}>
          <UserCircle className="w-4 h-4" />
          <span className="hidden lg:inline text-xs sm:text-sm">{t('myProfile')}</span>
        </Link>
      </Button>
      )}

      {/* Menu */}
      {isModuleEnabled('home') && (
      <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2.5">
        <Link to="/Landing">
          <Home className="w-4 h-4" />
          <span className="hidden lg:inline text-xs sm:text-sm">Home</span>
        </Link>
      </Button>
      )}

      {/* Catering — top-level, sits between Packages and Operations */}
      {canAccessCatering && isRouteOpen("Catering") && (
        <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2.5">
          <Link to="/Catering">
            <PartyPopper className="w-4 h-4" />
            <span className="hidden lg:inline text-xs sm:text-sm">Catering</span>
          </Link>
        </Button>
      )}

      {/* POS now lives as a tab inside the Catering module */}

      <NavDropdown label="Operations" icon={LayoutGrid} items={operationsItems} />

      <NavDropdown label="Analytics" icon={BarChart3} items={analyticsItems} />

      {/* Help */}
      <HelpNavMenu />

      {/* Admin */}
      {canAccessAdmin && (
        <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2.5">
          <Link to={createPageUrl("Admin")}>
            <Settings className="w-4 h-4" />
            <span className="hidden lg:inline text-xs sm:text-sm">{t('admin')}</span>
          </Link>
        </Button>
      )}

      {/* Manual now lives as a tab inside Support */}
    </>
  );
}