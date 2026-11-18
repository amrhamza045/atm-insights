import { Link } from "react-router-dom";
import { useQuery, useQueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "./utils";
import { toast } from "sonner";
import { Users, GitBranch, Gift, Settings, UserCircle, LogOut, MessageCircle, Trophy, UtensilsCrossed, PackageOpen, Package, PoundSterling, Truck, Check, ChefHat, BarChart3, ArrowLeft, Home, History, ShoppingCart, Navigation, UserPlus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Logo from "@/components/Logo";
import RestaurantLogo from "@/components/RestaurantLogo";
import AdminNavMenu from "@/components/layout/AdminNavMenu";
import HelpNavMenu from "@/components/layout/HelpNavMenu";
import NavButtonLink from "@/components/layout/NavButtonLink";
import { LanguageProvider, useLanguage } from "@/components/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import NotificationDropdown from "@/components/NotificationDropdown";
import VeragatesFooter from "@/components/VeragatesFooter";
import { PermissionsProvider, usePermissions, useHasAnyPermission, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { BranchProvider, useBranch } from "@/components/branches/BranchContext";
import BranchSelector from "@/components/branches/BranchSelector";
import PortalNavLink from "@/components/portal/PortalNavLink";
import MyCustodyNavLink from "@/components/catering/custody/MyCustodyNavLink";
import TimezoneLoader from "@/components/admin/TimezoneLoader";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePullToRefresh } from "@/components/hooks/usePullToRefresh";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ProfileCompletionModal from "@/components/client/ProfileCompletionModal";
import ArabicAutoTranslator from "@/components/i18n/ArabicAutoTranslator";
import ScrollLockWatchdog from "@/components/ScrollLockWatchdog";
import NumeralEnforcer from "@/components/i18n/NumeralEnforcer";
import { applyBrandTheme } from "@/lib/brandTheme";
import { setBrandName } from "@/lib/brandName";
import PathTrail from "@/components/layout/PathTrail";
import useStaffAccess from "@/components/access/useStaffAccess";

function LayoutContent({ children, currentPageName }) {
  const { t } = useLanguage();
  const isAdmin = useIsAdmin();
  const location = useLocation();
  const queryClient = useQueryClient();
  const pageViewStartTime = useRef(Date.now());
  const currentPageViewId = useRef(null);
  const [prevTab, setPrevTab] = useState(null);
  const menuScrollPos = useRef(0);
  const profileScrollPos = useRef(0);
  const isMobileNav = location.pathname !== createPageUrl("Packages") && location.pathname !== createPageUrl("MyProfile");
  
  // Preserve scroll position per tab on iOS
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Save scroll position before leaving
    const saveScrollPosition = () => {
      if (currentPath === createPageUrl("Packages")) {
        menuScrollPos.current = window.scrollY;
      } else if (currentPath === createPageUrl("MyProfile")) {
        profileScrollPos.current = window.scrollY;
      }
    };

    window.addEventListener("beforeunload", saveScrollPosition);
    return () => window.removeEventListener("beforeunload", saveScrollPosition);
  }, [location.pathname]);

  // Restore scroll position when returning to tab
  useEffect(() => {
    const currentPath = location.pathname;
    let savedPosition = 0;

    if (currentPath === createPageUrl("Packages") && menuScrollPos.current > 0) {
      savedPosition = menuScrollPos.current;
    } else if (currentPath === createPageUrl("MyProfile") && profileScrollPos.current > 0) {
      savedPosition = profileScrollPos.current;
    }

    if (savedPosition > 0) {
      setTimeout(() => window.scrollTo(0, savedPosition), 100);
    }
  }, [location.pathname]);
  
  // Global pull-to-refresh for all pages
  const handleGlobalRefresh = async () => {
    try {
      await queryClient.refetchQueries({ type: "active" });
      toast.success("Refreshed!");
    } catch (error) {
      console.error("Refresh failed:", error);
    }
  };

  usePullToRefresh(handleGlobalRefresh, true);

  const { data: restaurantInfo, isFetched: isRestaurantInfoFetched } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      try {
        const info = await base44.entities.RestaurantInfo.list();
        return info[0] || null;
      } catch {
        return null;
      }
    }
  });

  useEffect(() => {
    if (isRestaurantInfoFetched) {
      setBrandName(restaurantInfo?.brand_name);
      document.title = restaurantInfo?.brand_name || "Restaurant";
    }
  }, [restaurantInfo, isRestaurantInfoFetched]);

  // Reconcile the synchronous boot theme with the live tenant record.
  useEffect(() => {
    if (isRestaurantInfoFetched) {
      applyBrandTheme(restaurantInfo);
    }
  }, [restaurantInfo, isRestaurantInfoFetched]);

  // Track page views — deferred to avoid blocking page render
  useEffect(() => {
    // Defer analytics to next tick so it never blocks rendering
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;

    const idleId = idleCallback(async () => {
      try {
        // Use cached session ID (no async call needed)
        let sessionId = sessionStorage.getItem('visitor_session_id');
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('visitor_session_id', sessionId);
        }

        // Detect device type synchronously
        const userAgent = navigator.userAgent.toLowerCase();
        let deviceType = 'desktop';
        if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
          deviceType = 'mobile';
        } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
          deviceType = 'tablet';
        }

        // Fire-and-forget: create page view record without blocking
        base44.entities.PageView.create({
          page_name: currentPageName || 'Unknown',
          page_url: window.location.href,
          user_id: currentUser?.id || null,
          user_email: currentUser?.email || null,
          user_role: currentUser?.role || null,
          session_id: sessionId,
          is_guest: !currentUser,
          device_type: deviceType,
          browser: navigator.userAgent
        }).then((pageView) => {
          currentPageViewId.current = pageView?.id || null;
          pageViewStartTime.current = Date.now();
        }).catch(() => {});
      } catch (error) {
        // Silently ignore analytics errors
      }
    });

    return () => cancelIdle(idleId);

    // Track duration when leaving page
    return () => {
      if (currentPageViewId.current) {
        const duration = Math.floor((Date.now() - pageViewStartTime.current) / 1000);
        base44.entities.PageView.update(currentPageViewId.current, {
          duration_seconds: duration
        }).catch(() => {});
      }
    };
  }, [location.pathname, currentPageName]);
  
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 15_000
  });

  const { data: client } = useQuery({
    queryKey: ["client", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const clients = await base44.entities.Client.filter({ email: currentUser.email });
      return clients[0] || null;
    },
    enabled: !!currentUser?.email
  });

  const { data: employee } = useQuery({
    queryKey: ["employee", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const employees = await base44.entities.Employee.filter({ email: currentUser.email });
      return employees[0] || null;
    },
    enabled: !!currentUser?.email && !isAdmin
  });

  // Resolved once by PermissionsProvider (live role + per-user overrides).
  // Staff-only view of it, so client accounts keep falling through to the
  // registered-client navigation exactly as before.
  const { permissions } = usePermissions();
  const userPermissions = permissions?.role && permissions.role !== "view_only" ? permissions : null;
  const { selectedBranch, selectedBranchId } = useBranch();
  const { isModuleEnabled, isRouteOpen } = useModuleAccess();
  // Customers and guests only reach the website, their portal and invitations.
  const { isStaff } = useStaffAccess();

  const isEmployee = !!employee && employee.status !== "terminated" && employee.status !== "inactive";
  const isRegistered = isAdmin || !!client;

  // Section visibility based on granular permissions (for non-admin users with custom perms)
  const canAccessPOS = isAdmin || permissions?.pos_view || permissions?.pos_access;
  const canAccessCashier = isAdmin || permissions?.cashier_view;
  const canAccessInventory = isAdmin || permissions?.inventory_view || permissions?.inventory_edit || permissions?.inventory_manage;
  const canAccessPurchase = isAdmin || permissions?.purchase_view || permissions?.purchase_edit;
  const canAccessAdminSettings = isAdmin || permissions?.admin_settings;
  const canAccessAdminOperations = isAdmin || permissions?.admin_operations;
  const canAccessAdminSystems = isAdmin || permissions?.admin_systems;
  const canAccessAnyAdminTab = canAccessAdminSettings || canAccessAdminOperations || canAccessAdminSystems;
  const canAccessSales = isAdmin || permissions?.sales_view;
  const canAccessDelivery = isAdmin || permissions?.delivery_view;
  const canAccessKDS = isAdmin || permissions?.kds_view;
  const canAccessKDSBar = isAdmin || permissions?.kds_bar_view;
  const canAccessAttendanceModule = isAdmin || permissions?.attendance_checkin || permissions?.hr_view_own;
  const canAccessHR = isAdmin || permissions?.hr_view_all || permissions?.hr_edit || permissions?.hr_attendance_approve;
  const canAccessAnalytics = isAdmin || permissions?.analytics_view || permissions?.financial_view || permissions?.sales_view;
  const canAccessSegmentsOnly = permissions?.marketing_view_segments;
  const canAccessTreasuryModules = permissions?.custody_view || permissions?.custody_manage || permissions?.custody_approve || permissions?.expenses_view || permissions?.expenses_edit || permissions?.expenses_config || permissions?.expense_approve;
  const canAccessOperations = canAccessKDS || canAccessKDSBar || canAccessDelivery || canAccessAttendanceModule || canAccessHR || canAccessAdminOperations || canAccessSegmentsOnly || canAccessTreasuryModules || permissions?.catering_payment_approve || permissions?.catering_finance || permissions?.catering_view || permissions?.catering_edit || permissions?.support_customization;

  // Persona nav strips. The assigned role still selects a strip, and the
  // equivalent permission flags now do too — but only for users who don't
  // already qualify for the broader admin/operations navigation, so nobody is
  // demoted into a narrower strip. Order of precedence: cashier → delivery → inventory.
  const hasBroaderNav = isAdmin || (!!userPermissions && (canAccessAnyAdminTab || canAccessOperations || canAccessAnalytics));
  const isCashier = !hasBroaderNav && !!permissions?.cashier_view;
  const isDeliveryDriver = !isCashier && !hasBroaderNav && !!permissions?.delivery_view;
  const isInventoryManager = !isCashier && !isDeliveryDriver && !hasBroaderNav &&
    !!(permissions?.inventory_view || permissions?.inventory_edit);

  const navigate = useNavigate();

  // Show profile completion modal for clients with incomplete data (old accounts)
  const needsProfileCompletion = !!client && !isAdmin && !isEmployee && (
    !client.onboarding_completed || !client.phone || !client.address
  );

  // Default landing page is the Menu — no redirect away from "/".
  // Authenticated users without any profile yet still go to registration.
  useEffect(() => {
    if (location.pathname === "/" && currentUser) {
      if (!isAdmin && !client && !isEmployee && !userPermissions) {
        navigate("/Register", { replace: true });
      }
    }
  }, [location.pathname, currentUser, isAdmin, client, isEmployee, userPermissions, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <TimezoneLoader />
      <ArabicAutoTranslator />
      <ScrollLockWatchdog />
      <NumeralEnforcer />
      {/* Header */}
      <div className="h-16" aria-hidden="true" />
      <header className="bg-white border-b border-slate-200 sticky !fixed top-0 inset-x-0 z-50 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {isMobileNav && (
              <button 
                onClick={() => window.history.back()}
                className="md:hidden p-2 hover:bg-slate-100 rounded-lg user-select-none"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>
            )}
            <Link 
              to="/"
              className="flex items-center gap-3 flex-shrink-0"
            >
              <RestaurantLogo className="h-9" />
              <h1 data-no-translate className="font-bold text-slate-900 tracking-tight hidden sm:block">{restaurantInfo?.brand_name || "Restaurant"}</h1>
            </Link>
            
            <nav className="flex items-center justify-center gap-1.5 flex-1">
              {!currentUser ? (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => base44.auth.redirectToLogin(window.location.origin + '/Register')}
                    className="gap-1 px-3 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <UserCircle className="w-4 h-4" />
                    <span className="text-xs sm:text-sm font-semibold">Login/Signup</span>
                  </Button>
                </>
              ) : (isAdmin || (!isDeliveryDriver && !isInventoryManager && !isCashier && !!userPermissions && (canAccessAnyAdminTab || canAccessOperations || canAccessAnalytics))) ? (
                <AdminNavMenu t={t} />
              ) : !isDeliveryDriver && !isInventoryManager && !isCashier && !!userPermissions && currentUser && (canAccessPOS || canAccessCashier || canAccessInventory || canAccessPurchase || canAccessAnyAdminTab || canAccessSales) ? (
                /* Custom-permissions non-role users */
                <>
                  {canAccessPOS && isModuleEnabled('pos') && <NavButtonLink to={createPageUrl("POS")} icon={PoundSterling} label="POS" />}
                  {canAccessSales && isRouteOpen('Sales') && <NavButtonLink to="/Sales" icon={ShoppingCart} label="Sales" />}
                  {canAccessInventory && isModuleEnabled('inventory') && <NavButtonLink to={createPageUrl("InventoryManagement")} icon={Package} label="Inventory" />}
                  {canAccessAnyAdminTab && <NavButtonLink to={createPageUrl("Admin")} icon={Settings} label={t('admin')} />}
                  <HelpNavMenu />
                </>
              ) : isDeliveryDriver ? (
                <>
                  {isModuleEnabled('delivery') && (
                    <>
                      <NavButtonLink to="/DeliveryPortal" icon={Navigation} label="Delivery Portal" />
                      <NavButtonLink to={createPageUrl("DeliveryDriverDashboard")} icon={Truck} label="My Deliveries" />
                    </>
                  )}
                  <HelpNavMenu />
                </>
              ) : isInventoryManager ? (
                <>
                  {isModuleEnabled('inventory') && <NavButtonLink to={createPageUrl("InventoryManagement")} icon={Package} label="Inventory" />}
                  {isModuleEnabled('menu') && <NavButtonLink to={createPageUrl("MenuManagement")} icon={UtensilsCrossed} label="Menu" />}
                  {isRouteOpen('MenuEngineering') && <NavButtonLink to={createPageUrl("MenuEngineering")} icon={BarChart3} label="Engineering" />}
                  <HelpNavMenu />
                </>
              ) : isCashier ? (
                <>
                  {isModuleEnabled('pos') && <NavButtonLink to={createPageUrl("POS")} icon={PoundSterling} label="POS" />}
                  {isModuleEnabled('cashier') && <NavButtonLink to={createPageUrl("Cashier")} icon={Wallet} label="Cashier" />}
                  {isModuleEnabled('inventory') && <NavButtonLink to={createPageUrl("InventoryManagement")} icon={Package} label="Inventory" />}
                  {isModuleEnabled('purchases') && <NavButtonLink to={createPageUrl("Purchases")} icon={ShoppingCart} label="Purchases" />}
                  {(canAccessAttendanceModule || isCashier) && isRouteOpen('EmployeeAttendance') && <NavButtonLink to={createPageUrl("EmployeeAttendance")} icon={Users} label="Attendance" />}
                  <HelpNavMenu />
                </>
              ) : isEmployee ? (
                <>
                  {isModuleEnabled('hr_attendance') && <NavButtonLink to={createPageUrl("EmployeeAttendance")} icon={Users} label="Attendance" />}
                  <HelpNavMenu />
                </>
              ) : isRegistered && isStaff ? (
                <>
                  <NavButtonLink to={createPageUrl("MyProfile")} icon={UserCircle} label={t('myProfile')} />
                  {canAccessSales && isRouteOpen('Sales') && <NavButtonLink to="/Sales" icon={ShoppingCart} label="Sales" />}
                  <HelpNavMenu />
                </>
              ) : (
                <>
                  {isStaff && <HelpNavMenu />}
                </>
              )}

              {currentUser && <BranchSelector />}

              {currentUser && <NotificationDropdown currentUser={currentUser} client={client} />}
              </nav>
              <div className="flex items-center gap-1.5 flex-shrink-0">
              {currentUser && <MyCustodyNavLink currentUser={currentUser} employee={employee} />}

              <PortalNavLink currentUser={currentUser} />

              <LanguageSwitcher />

              <Logo className="h-6 hidden md:block flex-shrink-0" />

              {currentUser && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => base44.auth.logout()}
                  className="gap-1 px-2 sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline text-xs sm:text-sm">{t('logout')}</span>
                </Button>
              )}
              </div>
              </div>
              </div>
              </header>

      {currentUser && <PathTrail />}

      {/* Main Content */}
      <main>
        {/* The page being left unmounts at once. Kept alive for an exit
            animation, it saw the next page's address while still running,
            and Catering then sent you straight back to itself. */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Veragates Footer */}
      <VeragatesFooter />

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-slate-200 safe-area-inset-bottom z-50">
        <div className="flex items-center justify-around">
          <Link 
            to="/"
            onClick={() => {
              if (location.pathname === createPageUrl("Packages")) {
                if (prevTab === "menu") {
                  menuScrollPos.current = 0;
                  window.scrollTo(0, 0);
                }
                setPrevTab("menu");
              } else {
                menuScrollPos.current = window.scrollY;
                setPrevTab("menu");
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 h-16 gap-1 user-select-none transition-colors ${
              location.pathname === createPageUrl("Packages") 
                ? "text-amber-600" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-sm font-medium">Home</span>
          </Link>
          
          {currentUser ? (
            <>
              {isStaff && (
              <Link 
                to={createPageUrl("MyProfile")}
                onClick={() => {
                  if (location.pathname === createPageUrl("MyProfile")) {
                    if (prevTab === "profile") {
                      profileScrollPos.current = 0;
                      window.scrollTo(0, 0);
                    }
                    setPrevTab("profile");
                  } else {
                    profileScrollPos.current = window.scrollY;
                    setPrevTab("profile");
                  }
                }}
                className={`flex flex-col items-center justify-center flex-1 h-16 gap-1 user-select-none transition-colors ${
                  location.pathname === createPageUrl("MyProfile") 
                    ? "text-amber-600" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Profile</span>
              </Link>
              )}
              
              {(canAccessAttendanceModule || isCashier || isEmployee) && isRouteOpen('EmployeeAttendance') && (
                <Link
                  to={createPageUrl("EmployeeAttendance")}
                  className={`flex flex-col items-center justify-center flex-1 h-16 gap-1 user-select-none transition-colors ${
                    location.pathname === createPageUrl("EmployeeAttendance")
                      ? "text-amber-600"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">Attendance</span>
                </Link>
              )}

              {isStaff && <HelpNavMenu mobile active={location.pathname === createPageUrl("SupportBot")} />}

              <button 
                onClick={() => base44.auth.logout()}
                className="flex flex-col items-center justify-center flex-1 h-16 gap-1 text-red-600 hover:text-red-700 user-select-none transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </>
          ) : (
            <>
              {isStaff && <HelpNavMenu mobile active={location.pathname === createPageUrl("SupportBot")} />}

              <button
                onClick={() => base44.auth.redirectToLogin(window.location.origin + '/Register')}
                className="flex flex-col items-center justify-center flex-1 h-16 gap-1 text-amber-600 hover:text-amber-700 user-select-none transition-colors"
              >
                <UserCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Login/Signup</span>
              </button>
            </>
          )}
        </div>
      </nav>
      
      <Toaster />

      {needsProfileCompletion && (
        <ProfileCompletionModal
          client={client}
          open={true}
          onOpenChange={() => {}}
        />
      )}
    </div>
    );
    }

    export default function Layout({ children, currentPageName }) {
      return (
        <QueryClientProvider client={queryClientInstance}>
        <LanguageProvider>
          <BranchProvider>
            <PermissionsProvider>
              <LayoutContent currentPageName={currentPageName}>{children}</LayoutContent>
            </PermissionsProvider>
          </BranchProvider>
        </LanguageProvider>
        </QueryClientProvider>
      );
    }