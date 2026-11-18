import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { Suspense } from 'react';
import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';
import ChunkErrorBoundary from '@/components/ChunkErrorBoundary';
import ModuleRouteGuard from '@/components/ModuleRouteGuard';
import { PermissionsProvider } from '@/components/permissions/PermissionsContext';
import RoleHomeRoute from '@/components/permissions/RoleHomeRoute';
import VisitorGate from '@/components/access/VisitorGate';
import AudienceGate from '@/components/access/AudienceGate';
import PortalHomeRedirect from '@/components/access/PortalHomeRedirect';

// Lazy-load extra routes so they're code-split into separate chunks
const Sales = lazy(() => import('./pages/Sales'));
const DeliveryPortal = lazy(() => import('./pages/DeliveryPortal'));
const AppMarketingBrochure = lazy(() => import('./pages/AppMarketingBrochure'));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));
const ComparativeBranchReport = lazy(() => import('./pages/ComparativeBranchReport'));
const VeraKit360Manual = lazy(() => import('./pages/VeraKit360Manual'));
const StaffDataBackup = lazy(() => import('./pages/StaffDataBackup'));
const KitchenBarManual = lazy(() => import('./pages/KitchenBarManual'));
const Cashier = lazy(() => import('./pages/Cashier'));
const Purchases = lazy(() => import('./pages/Purchases'));
const Manufacturing = lazy(() => import('./pages/Manufacturing'));
const Butchery = lazy(() => import('./pages/Butchery'));
const ManufacturingAnalytics = lazy(() => import('./pages/ManufacturingAnalytics'));
const ButcheryAnalytics = lazy(() => import('./pages/ButcheryAnalytics'));
const Catering = lazy(() => import('./pages/Catering'));
const CateringPortal = lazy(() => import('./pages/CateringPortal'));
const EventRsvp = lazy(() => import('./pages/EventRsvp'));
const EventPass = lazy(() => import('./pages/EventPass'));
const MyCustody = lazy(() => import('./pages/MyCustody'));
const CRM = lazy(() => import('./pages/CRM'));
const ClientAnalytics = lazy(() => import('./pages/ClientAnalytics'));
const CallCenterPOS = lazy(() => import('./pages/CallCenterPOS'));
const CaptainPOS = lazy(() => import('./pages/CaptainPOS'));
const SellingPriority = lazy(() => import('./pages/SellingPriority'));
const ExpiryReports = lazy(() => import('./pages/ExpiryReports'));
const InventoryHub = lazy(() => import('./pages/InventoryHub'));
const PurchasesHub = lazy(() => import('./pages/PurchasesHub'));
const HRHub = lazy(() => import('./pages/HRHub'));
const SystemManual = lazy(() => import('./pages/SystemManual'));
const Landing = lazy(() => import('./pages/Landing'));
const PermissionCopyCheck = lazy(() => import('./pages/PermissionCopyCheck'));
const Finance = lazy(() => import('@/pages/Finance'));
const PettyCashCustody = lazy(() => import('@/pages/PettyCashCustody'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const OperationalMeetings = lazy(() => import('./pages/OperationalMeetings'));
const AssetsResources = lazy(() => import('./pages/AssetsResources'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

// Safely extract config with fallbacks
const { Pages = {}, Layout, mainPage = 'Menu' } = pagesConfig || {};
const mainPageKey = mainPage ?? Object.keys(Pages)[0] ?? 'Menu';
const MainPage = mainPageKey && Pages[mainPageKey] ? Pages[mainPageKey] : null;

const LayoutWrapper = ({ children, currentPageName }) => {
  const guarded = (
    <AudienceGate pageName={currentPageName}>
      <ModuleRouteGuard pageName={currentPageName}>{children}</ModuleRouteGuard>
    </AudienceGate>
  );
  return (
    <VisitorGate pageName={currentPageName}>
      {Layout ? (
        <Suspense fallback={<PageLoader />}>
          <Layout currentPageName={currentPageName}>{guarded}</Layout>
        </Suspense>
      ) : guarded}
    </VisitorGate>
  );
};

// "/" — visitors, and accounts whose role has no home page, get the public
// landing page; staff go to their role's home page (Admin › Role Management).
const HomeRoute = () => {
  const { isAuthenticated } = useAuth();
  const landing = <Suspense fallback={<PageLoader />}><Landing /></Suspense>;
  if (!isAuthenticated) return landing;
  return (
    <PermissionsProvider sync={false}>
      <RoleHomeRoute loading={<PageLoader />}>
        <PortalHomeRedirect loading={<PageLoader />}>{landing}</PortalHomeRedirect>
      </RoleHomeRoute>
    </PermissionsProvider>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  useVersionCheck();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageLoader />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return <PageLoader />;
    } else if (authError.type === 'unknown') {
      navigateToLogin();
      return <PageLoader />;
    }
  }

  // Render the main app — each page is lazy-loaded and wrapped in Suspense
  return (
    <ChunkErrorBoundary resetKey={location.pathname + location.search}>
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/Landing" element={<Suspense fallback={<PageLoader />}><Landing /></Suspense>} />
      {Object.entries(Pages).map(([path, Page]) => {
        if (!Page || path === "Packages") return null;
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Suspense fallback={<PageLoader />}>
                  <Page />
                </Suspense>
              </LayoutWrapper>
            }
          />
        );
      })}
      <Route path="/Packages" element={<Navigate to="/#packages" replace />} />
      <Route path="/Sales" element={<LayoutWrapper currentPageName="Sales"><Suspense fallback={<PageLoader />}><Sales /></Suspense></LayoutWrapper>} />
      <Route path="/DeliveryPortal" element={<LayoutWrapper currentPageName="DeliveryPortal"><Suspense fallback={<PageLoader />}><DeliveryPortal /></Suspense></LayoutWrapper>} />
      <Route path="/AppMarketingBrochure" element={<LayoutWrapper currentPageName="AppMarketingBrochure"><Suspense fallback={<PageLoader />}><AppMarketingBrochure /></Suspense></LayoutWrapper>} />
      <Route path="/ExecutiveDashboard" element={<LayoutWrapper currentPageName="ExecutiveDashboard"><Suspense fallback={<PageLoader />}><ExecutiveDashboard /></Suspense></LayoutWrapper>} />
      <Route path="/ComparativeBranchReport" element={<LayoutWrapper currentPageName="ComparativeBranchReport"><Suspense fallback={<PageLoader />}><ComparativeBranchReport /></Suspense></LayoutWrapper>} />
      <Route path="/VeraKit360Manual" element={<LayoutWrapper currentPageName="VeraKit360Manual"><Suspense fallback={<PageLoader />}><VeraKit360Manual /></Suspense></LayoutWrapper>} />
      <Route path="/StaffDataBackup" element={<LayoutWrapper currentPageName="StaffDataBackup"><Suspense fallback={<PageLoader />}><StaffDataBackup /></Suspense></LayoutWrapper>} />
      <Route path="/KitchenBarManual" element={<LayoutWrapper currentPageName="KitchenBarManual"><Suspense fallback={<PageLoader />}><KitchenBarManual /></Suspense></LayoutWrapper>} />
      <Route path="/Cashier" element={<LayoutWrapper currentPageName="Cashier"><Suspense fallback={<PageLoader />}><Cashier /></Suspense></LayoutWrapper>} />
      <Route path="/Purchases" element={<LayoutWrapper currentPageName="Purchases"><Suspense fallback={<PageLoader />}><Purchases /></Suspense></LayoutWrapper>} />
      <Route path="/Manufacturing" element={<LayoutWrapper currentPageName="Manufacturing"><Suspense fallback={<PageLoader />}><Manufacturing /></Suspense></LayoutWrapper>} />
      <Route path="/Butchery" element={<LayoutWrapper currentPageName="Butchery"><Suspense fallback={<PageLoader />}><Butchery /></Suspense></LayoutWrapper>} />
      <Route path="/ManufacturingAnalytics" element={<LayoutWrapper currentPageName="ManufacturingAnalytics"><Suspense fallback={<PageLoader />}><ManufacturingAnalytics /></Suspense></LayoutWrapper>} />
      <Route path="/ButcheryAnalytics" element={<LayoutWrapper currentPageName="ButcheryAnalytics"><Suspense fallback={<PageLoader />}><ButcheryAnalytics /></Suspense></LayoutWrapper>} />
      <Route path="/Catering" element={<LayoutWrapper currentPageName="Catering"><Suspense fallback={<PageLoader />}><Catering /></Suspense></LayoutWrapper>} />
      <Route path="/CateringPortal" element={<LayoutWrapper currentPageName="CateringPortal"><Suspense fallback={<PageLoader />}><CateringPortal /></Suspense></LayoutWrapper>} />
      <Route path="/CRM" element={<LayoutWrapper currentPageName="CRM"><Suspense fallback={<PageLoader />}><CRM /></Suspense></LayoutWrapper>} />
      <Route path="/ClientAnalytics" element={<LayoutWrapper currentPageName="ClientAnalytics"><Suspense fallback={<PageLoader />}><ClientAnalytics /></Suspense></LayoutWrapper>} />
      {/* Catering Insights was dissolved into the Executive Dashboard's Catering group. */}
      <Route path="/CateringInsights" element={<Navigate to="/ExecutiveDashboard" replace />} />
      <Route path="/CallCenterPOS" element={<LayoutWrapper currentPageName="CallCenterPOS"><Suspense fallback={<PageLoader />}><CallCenterPOS /></Suspense></LayoutWrapper>} />
      <Route path="/CaptainPOS" element={<LayoutWrapper currentPageName="CaptainPOS"><Suspense fallback={<PageLoader />}><CaptainPOS /></Suspense></LayoutWrapper>} />
      <Route path="/SellingPriority" element={<LayoutWrapper currentPageName="SellingPriority"><Suspense fallback={<PageLoader />}><SellingPriority /></Suspense></LayoutWrapper>} />
      <Route path="/ExpiryReports" element={<LayoutWrapper currentPageName="ExpiryReports"><Suspense fallback={<PageLoader />}><ExpiryReports /></Suspense></LayoutWrapper>} />
      <Route path="/InventoryHub" element={<LayoutWrapper currentPageName="InventoryHub"><Suspense fallback={<PageLoader />}><InventoryHub /></Suspense></LayoutWrapper>} />
      <Route path="/PurchasesHub" element={<LayoutWrapper currentPageName="PurchasesHub"><Suspense fallback={<PageLoader />}><PurchasesHub /></Suspense></LayoutWrapper>} />
      <Route path="/HRHub" element={<LayoutWrapper currentPageName="HRHub"><Suspense fallback={<PageLoader />}><HRHub /></Suspense></LayoutWrapper>} />
      <Route path="/OperationalMeetings" element={<LayoutWrapper currentPageName="OperationalMeetings"><Suspense fallback={<PageLoader />}><OperationalMeetings /></Suspense></LayoutWrapper>} />
      <Route path="/SystemManual" element={<LayoutWrapper currentPageName="SystemManual"><Suspense fallback={<PageLoader />}><SystemManual /></Suspense></LayoutWrapper>} />
      <Route path="/Finance" element={<LayoutWrapper currentPageName="Finance"><Suspense fallback={<PageLoader />}><Finance /></Suspense></LayoutWrapper>} />
      <Route path="/PettyCashCustody" element={<LayoutWrapper currentPageName="PettyCashCustody"><Suspense fallback={<PageLoader />}><PettyCashCustody /></Suspense></LayoutWrapper>} />
      <Route path="/Expenses" element={<LayoutWrapper currentPageName="Expenses"><Suspense fallback={<PageLoader />}><Expenses /></Suspense></LayoutWrapper>} />
      <Route path="/AssetsResources" element={<LayoutWrapper currentPageName="AssetsResources"><Suspense fallback={<PageLoader />}><AssetsResources /></Suspense></LayoutWrapper>} />
      {/* Support Customization now lives in the Admin panel; old links open its tab. */}
      <Route path="/SupportCustomization" element={<Navigate to="/Admin?tab=support-customization" replace />} />
      <Route path="/PermissionCopyCheck" element={<LayoutWrapper currentPageName="PermissionCopyCheck"><Suspense fallback={<PageLoader />}><PermissionCopyCheck /></Suspense></LayoutWrapper>} />
      <Route path="/MyCustody" element={<LayoutWrapper currentPageName="MyCustody"><Suspense fallback={<PageLoader />}><MyCustody /></Suspense></LayoutWrapper>} />
      <Route path="/EventRsvp" element={<LayoutWrapper currentPageName="EventRsvp"><Suspense fallback={<PageLoader />}><EventRsvp /></Suspense></LayoutWrapper>} />
      <Route path="/EventPass" element={<LayoutWrapper currentPageName="EventPass"><Suspense fallback={<PageLoader />}><EventPass /></Suspense></LayoutWrapper>} />
      {/* Old invitation emails point here — send those visitors to the landing page. */}
      <Route path="/ReferralTree" element={<Navigate to="/" replace />} />
      <Route path="*" element={<LayoutWrapper currentPageName="PageNotFound"><PageNotFound /></LayoutWrapper>} />
    </Routes>
    </ChunkErrorBoundary>
  );
};


function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App