import { lazyWithRetry as lazy } from '@/lib/lazyWithRetry';

// Lazy-load every page so Vite code-splits each into its own chunk.
// This dramatically reduces initial bundle size and load time.
const Admin = lazy(() => import('./pages/Admin'));
const Approvals = lazy(() => import('./pages/Approvals'));
const BulkDeleteTestData = lazy(() => import('./pages/BulkDeleteTestData'));
const CashbackHistory = lazy(() => import('./pages/CashbackHistory'));
const DeliveryDriverDashboard = lazy(() => import('./pages/DeliveryDriverDashboard'));
const EmployeeAttendance = lazy(() => import('./pages/EmployeeAttendance'));
const GoLiveCleanup = lazy(() => import('./pages/GoLiveCleanup'));
const InventoryManagement = lazy(() => import('./pages/InventoryManagement'));
const KitchenDisplay = lazy(() => import('./pages/KitchenDisplay'));
const LoyaltyProgramInfo = lazy(() => import('./pages/LoyaltyProgramInfo'));
const Packages = lazy(() => import('./pages/Packages'));
const MenuEngineering = lazy(() => import('./pages/MenuEngineering'));
const MenuManagement = lazy(() => import('./pages/MenuManagement'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const POS = lazy(() => import('./pages/POS'));
const ReferralLeaderboard = lazy(() => import('./pages/ReferralLeaderboard'));
const ReferralTree = lazy(() => import('./pages/ReferralTree'));
const Register = lazy(() => import('./pages/Register'));
const Rewards = lazy(() => import('./pages/Rewards'));
const SupplierHub = lazy(() => import('./pages/SupplierHub'));
const SupportBot = lazy(() => import('./pages/SupportBot'));
const __Layout = lazy(() => import('./Layout.jsx'));

export const PAGES = {
    "Admin": Admin,
    "Approvals": Approvals,
    "BulkDeleteTestData": BulkDeleteTestData,
    "CashbackHistory": CashbackHistory,
    "DeliveryDriverDashboard": DeliveryDriverDashboard,
    "EmployeeAttendance": EmployeeAttendance,
    "GoLiveCleanup": GoLiveCleanup,
    "InventoryManagement": InventoryManagement,
    "KitchenDisplay": KitchenDisplay,
    "LoyaltyProgramInfo": LoyaltyProgramInfo,
    "Packages": Packages,
    "MenuEngineering": MenuEngineering,
    "MenuManagement": MenuManagement,
    "MyProfile": MyProfile,
    "OrderHistory": OrderHistory,
    "POS": POS,
    "ReferralLeaderboard": ReferralLeaderboard,
    "Register": Register,
    "Rewards": Rewards,
    "SupplierHub": SupplierHub,
    "SupportBot": SupportBot,
}

export const pagesConfig = {
    mainPage: "Packages",
    Pages: PAGES,
    Layout: __Layout,
};