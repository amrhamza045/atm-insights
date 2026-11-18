import React, { useState, Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import ChunkErrorBoundary from "@/components/ChunkErrorBoundary";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, Gift, Users, Percent, Plus, Pencil, Trash2, Palette, Boxes,
  PoundSterling, Tag, ShoppingCart, BarChart3, Trophy, Bell, Activity, Rocket, History,
  ChevronDown, ChevronUp, Wrench, Database, Search, X, Truck, Share2, MessageSquare, Check, AlertTriangle, Clock, Calendar, UserCheck, Building2, TrendingUp, RefreshCw, Scale, Shield
} from "lucide-react";
import { toast } from "sonner";

const RewardForm = lazy(() => import('@/components/admin/RewardForm'));
const UsersTabContent = lazy(() => import('@/components/admin/UsersTabContent'));
const CashbackSettings = lazy(() => import('@/components/admin/CashbackSettings'));
const CategoryManagement = lazy(() => import('@/components/admin/CategoryManagement'));
const RegistrationApprovals = lazy(() => import('@/components/admin/RegistrationApprovals'));
const LevelUpgradeApprovals = lazy(() => import('@/components/admin/LevelUpgradeApprovals'));
const AdminRegistrationSubmit = lazy(() => import('@/components/admin/AdminRegistrationSubmit'));
const EmailNotificationSettings = lazy(() => import('@/components/admin/EmailNotificationSettings'));
const RestaurantInfoSettings = lazy(() => import('@/components/admin/RestaurantInfoSettings'));
const RegistrationLevelManagement = lazy(() => import('@/components/admin/RegistrationLevelManagement'));
const PaymentMethodSettings = lazy(() => import('@/components/admin/PaymentMethodSettings'));
const PaymentMethodsToggle = lazy(() => import('@/components/admin/PaymentMethodsToggle'));
const StripePaymentGateway = lazy(() => import('@/components/admin/StripePaymentGateway'));
const RedemptionApprovals = lazy(() => import('@/components/admin/RedemptionApprovals'));
const AdminRedemptionSubmit = lazy(() => import('@/components/admin/AdminRedemptionSubmit'));
const MilestoneManagement = lazy(() => import('@/components/admin/MilestoneManagement'));
const LoyaltyTierManagement = lazy(() => import('@/components/admin/LoyaltyTierManagement'));
const AuditLogViewer = lazy(() => import('@/components/admin/AuditLogViewer'));
const ClientCashbackHistory = lazy(() => import('@/components/admin/ClientCashbackHistory'));
const SupportCustomizationWorkspace = lazy(() => import('@/components/support/SupportCustomizationWorkspace'));

const GoLiveCleanup = lazy(() => import('@/pages/GoLiveCleanup'));
const TableManagement = lazy(() => import('@/components/admin/TableManagement'));
const PrinterSettings = lazy(() => import('@/components/admin/PrinterSettings'));
const DeliveryPersonManagement = lazy(() => import('@/components/admin/DeliveryPersonManagement'));
const DeliveryZoneManagement = lazy(() => import('@/components/admin/DeliveryZoneManagement'));
const DeliveryCompanyManagement = lazy(() => import('@/components/admin/DeliveryCompanyManagement'));
const DeliveryBonusManager = lazy(() => import('@/components/admin/DeliveryBonusManager'));
import { logSuccess, logFailure } from "@/components/utils/auditLogHelper";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PermissionGuard from "@/components/permissions/PermissionGuard";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import ApprovalsCenterNotice from "@/components/approvals/ApprovalsCenterNotice";
import AdminTabStrip from "@/components/admin/AdminTabStrip";
import AdminTrail from "@/components/admin/AdminTrail";
import { useLocation, useNavigate } from "react-router-dom";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { moduleForTab } from "@/lib/moduleRegistry";

const DefaultRootClientSettings = lazy(() => import("@/components/admin/DefaultRootClientSettings"));
const RoleManagement = lazy(() => import("@/components/admin/RoleManagement"));
const AutoApprovalSetting = lazy(() => import("@/components/admin/AutoApprovalSetting"));
const TimezoneSettings = lazy(() => import("@/components/admin/TimezoneSettings"));
const ScheduleSettings = lazy(() => import("@/components/admin/ScheduleSettings"));
const LanguagePreferenceSettings = lazy(() => import("@/components/admin/LanguagePreferenceSettings"));
const PreparationSettings = lazy(() => import("@/components/admin/PreparationSettings"));
const InventoryWeightComplianceReport = lazy(() => import("@/components/admin/InventoryWeightComplianceReport"));
const UnitConversionSettings = lazy(() => import("@/components/admin/UnitConversionSettings"));
const PreparationAreaManagement = lazy(() => import("@/components/admin/PreparationAreaManagement"));
const SMSPreferences = lazy(() => import("@/components/notifications/SMSPreferences"));
const KDSSettings = lazy(() => import("@/components/admin/KDSSettings"));
const ExtraItemsLimitSetting = lazy(() => import("@/components/catering/requisition/ExtraItemsLimitSetting"));
const CashbackRuleManagement = lazy(() => import("@/components/admin/CashbackRuleManagement"));
const CashbackRuleHistory = lazy(() => import("@/components/admin/CashbackRuleHistory"));
const TopReferrersDashboard = lazy(() => import("@/components/admin/TopReferrersDashboard"));
const CashbackMonthlyReport = lazy(() => import("@/components/admin/CashbackMonthlyReport"));
const CompaniesManager = lazy(() => import("@/components/admin/companies/CompaniesManager"));
const BulkBranchReassignment = lazy(() => import("@/components/admin/BulkBranchReassignment"));
const DataCloneManager = lazy(() => import("@/components/admin/DataCloneManager"));
const ClearCacheButton = lazy(() => import("@/components/admin/ClearCacheButton"));
const BranchIsolationWorkspace = lazy(() => import("@/components/admin/isolation/BranchIsolationWorkspace"));
const StaffDataBackup = lazy(() => import('@/pages/StaffDataBackup'));
const FullSystemExport = lazy(() => import('@/components/admin/FullSystemExport'));
const SocialMediaConnections = lazy(() => import("@/components/admin/SocialMediaConnections"));
const BrandingSettings = lazy(() => import("@/components/branding/BrandingSettings"));
const ModuleManagement = lazy(() => import("@/components/admin/ModuleManagement"));
const AdminInnerTabs = lazy(() => import("@/components/admin/AdminInnerTabs"));
const VendorSupportSettings = lazy(() => import("@/components/admin/VendorSupportSettings"));

export default function Admin() {
  // The open tab lives in the address (/Admin?tab=roles) so Back / Forward,
  // Recent locations, refresh and the path bar all agree on where you are.
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = new URLSearchParams(location.search).get("tab") || "data-cleanup";
  const setActiveTab = (id) => {
    if (id === activeTab) return;
    const params = new URLSearchParams(location.search);
    params.set("tab", id);
    navigate(`/Admin?${params}`);
  };
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  const { permissions } = usePermissions();
  const { isModuleEnabled, isTabOpen } = useModuleAccess();

  // Older /Admin#tabId links (and the manual screenshot tool, which switches
  // tabs via the hash) are moved into the address as ?tab=tabId.
  const allTabsRef = React.useRef([]);
  React.useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) return;
      const params = new URLSearchParams(window.location.search);
      params.set("tab", hash);
      navigate(`/Admin?${params}`, { replace: true });
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [location.hash]);

  // Menu is now its own screen under Operations in the top bar; old Admin › Menu links open it.
  React.useEffect(() => {
    if (activeTab === 'menu') navigate('/MenuManagement', { replace: true });
  }, [activeTab]);


  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const queryClient = useQueryClient();

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => base44.entities.Reward.list("-created_date"),
    enabled: activeTab === "rewards" || showRewardForm
  });

  const createRewardMutation = useMutation({
    mutationFn: (data) => base44.entities.Reward.create(data),
    onSuccess: (newReward, data) => {
      logSuccess("create", "Reward", `Created reward: ${data.name}`, {
        entityId: newReward.id,
        entityName: data.name
      });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success("Reward created successfully");
      setShowRewardForm(false);
    },
    onError: (error) => {
      logFailure("create", "Reward", "Failed to create reward", error.message);
    }
  });

  const updateRewardMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Reward.update(id, data),
    onSuccess: (_, { id, data }) => {
      logSuccess("update", "Reward", `Updated reward: ${data.name}`, {
        entityId: id,
        entityName: data.name
      });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success("Reward updated successfully");
      setShowRewardForm(false);
      setEditingReward(null);
    },
    onError: (error, { id, data }) => {
      logFailure("update", "Reward", `Failed to update reward: ${data.name}`, error.message, {
        entityId: id,
        entityName: data.name
      });
    }
  });

  const deleteRewardMutation = useMutation({
    mutationFn: (id) => base44.entities.Reward.delete(id),
    onSuccess: (_, rewardId) => {
      const reward = rewardToDelete;
      logSuccess("delete", "Reward", `Deleted reward: ${reward.name}`, {
        entityId: rewardId,
        entityName: reward.name
      });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success("Reward deleted");
    },
    onError: (error, rewardId) => {
      logFailure("delete", "Reward", "Failed to delete reward", error.message, {
        entityId: rewardId
      });
    }
  });

  // Determine section access for non-admin users
  const isAdmin = useIsAdmin();
  const canAccessSettings = isAdmin || permissions?.admin_settings;
  const canAccessOperations = isAdmin || permissions?.admin_operations;
  const canAccessSystems = isAdmin || permissions?.admin_systems;
  // Support Customization lives here now; its permission alone opens the panel with just that tab.
  const canAccessSupport = permissions?.support_customization === true && isModuleEnabled("support_customization");
  const hasAnyAdminAccess = canAccessSettings || canAccessOperations || canAccessSystems || canAccessSupport;

  // Wait for both user and permissions to load before checking access
  if (!currentUser || (!isAdmin && permissions === undefined)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect non-admin users with no permissions
  if (!isAdmin && !hasAnyAdminAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <div className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
            <p className="text-slate-600">You don't have permission to access the admin panel.</p>
            <Button 
              onClick={() => window.location.href = createPageUrl("Home")}
              className="w-full"
            >
              Go to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Define all tabs with their metadata
  const allTabs = [
    { id: 'companies', label: 'Companies', section: 'settings', group: 'Business Setup', icon: Building2, permission: 'finance_company_manage', keywords: ['company', 'companies', 'legal', 'branch', 'branches', 'multi', 'location', 'storage'] },
    { id: 'restaurant', label: 'Restaurant Info', section: 'settings', group: 'Business Setup', icon: Settings, keywords: ['restaurant', 'info', 'contact', 'social', 'payment', 'numbers', 'instapay', 'wallet'] },
    { id: 'branding', label: 'Branding', section: 'settings', group: 'Business Setup', icon: Palette, keywords: ['branding', 'logo', 'color', 'colour', 'theme', 'palette', 'brand name', 'brand', 'identity'] },
    { id: 'modules', label: 'Modules', section: 'settings', group: 'Business Setup', icon: Boxes, keywords: ['modules', 'open', 'close', 'enable', 'disable', 'toggle', 'access', 'hide', 'show'] },

    { id: 'vendor-support', label: 'Vendor / Support info', section: 'settings', group: 'Business Setup', icon: Settings, keywords: ['vendor', 'support', 'veragates', 'manual', 'footer'] },
    { id: 'support-customization', label: 'Support Customization', section: 'settings', group: 'Business Setup', icon: Settings, permission: 'support_customization', keywords: ['support', 'customization', 'customize', 'workspace', 'quick edit', 'scope', 'impact'] },
    { id: 'timezone', label: 'Timezone', section: 'settings', group: 'Regional & Format', icon: Settings, keywords: ['timezone', 'time', 'utc', 'offset'] },
    { id: 'language-preference', label: 'Numeral Preferences', section: 'settings', group: 'Regional & Format', icon: Settings, keywords: ['language', 'preference', 'numbers', 'numerals', 'arabic', 'english', 'digits'] },

    { id: 'email', label: 'Email', section: 'settings', group: 'Comms Config', icon: Bell, keywords: ['email', 'notifications', 'settings'] },
    { id: 'sms-settings', label: 'SMS Notifications', section: 'settings', group: 'Comms Config', icon: MessageSquare, keywords: ['sms', 'text', 'notifications', 'alerts', 'phone', 'mobile'] },

    { id: 'users', label: 'Users', section: 'settings', group: 'Access Control', icon: Users, keywords: ['users', 'permissions', 'access', 'invite'] },
    { id: 'roles', label: 'Role Management', section: 'settings', group: 'Access Control', icon: Shield, keywords: ['roles', 'role', 'management', 'permissions', 'presets', 'access'] },

    { id: 'cashback', label: 'Cashback', section: 'settings', group: 'Loyalty Program Config', icon: Percent, keywords: ['cashback', 'percentage', 'tier', 'level'] },
    { id: 'cashback-rules', label: 'Cashback Rules', section: 'settings', group: 'Loyalty Program Config', icon: Settings, keywords: ['cashback', 'rules', 'rates', 'order type', 'tier', 'promotional'] },
    { id: 'reg-levels', label: 'Reg Levels', section: 'settings', group: 'Loyalty Program Config', icon: Users, keywords: ['registration', 'levels', 'fee'] },
    { id: 'loyalty', label: 'Loyalty Tiers', section: 'settings', group: 'Loyalty Program Config', icon: Trophy, keywords: ['loyalty', 'tiers', 'rewards'] },
    { id: 'milestones', label: 'Milestones', section: 'settings', group: 'Loyalty Program Config', icon: Trophy, keywords: ['milestones', 'bonus', 'referral'] },
    { id: 'categories', label: 'Categories', section: 'settings', group: 'Loyalty Program Config', icon: Tag, keywords: ['categories', 'rewards'] },

    { id: 'printer', label: 'Printer', section: 'settings', group: 'Kitchen & Inventory', icon: Settings, keywords: ['printer', 'receipt', 'print', 'thermal', 'pos'] },
    { id: 'preparation', label: 'Preparation', section: 'settings', group: 'Kitchen & Inventory', icon: Settings, keywords: ['preparation', 'kitchen', 'bar', 'orders', 'print'] },
    { id: 'unit-conversions', label: 'Unit Conversions', section: 'settings', group: 'Kitchen & Inventory', icon: Scale, keywords: ['unit', 'units', 'conversion', 'conversions', 'kg', 'grams', 'liters', 'ml', 'packaging', 'box', 'pieces', 'recipe', 'inventory'] },
    { id: 'inventory-compliance', label: 'Inventory Compliance', section: 'settings', group: 'Kitchen & Inventory', icon: Scale, keywords: ['compliance', 'inventory', 'weight', 'purchase', 'consumption', 'variance', 'raw material'] },
    { id: 'kds', label: 'KDS Settings', section: 'settings', group: 'Kitchen & Inventory', icon: Settings, keywords: ['kds', 'kitchen', 'display', 'sound', 'alerts', 'audio'] },

    { id: 'registrations', label: 'Registrations', section: 'systems', group: 'Order & Guest Ops', icon: Users, keywords: ['registrations', 'approvals', 'new', 'clients'] },

    { id: 'redemptions', label: 'Redemptions', section: 'systems', group: 'Loyalty Ops', icon: Gift, keywords: ['redemptions', 'rewards', 'redeem'] },
    { id: 'cashback-approvals', label: 'Cashback Approvals', section: 'systems', group: 'Loyalty Ops', icon: Check, keywords: ['cashback', 'approval', 'distribution', 'orders', 'pending'] },

    { id: 'social-connections', label: 'Social Media', section: 'systems', group: 'Marketing & Outreach', permission: 'social_media_view', icon: Share2, keywords: ['social', 'media', 'facebook', 'instagram', 'linkedin', 'connection', 'webhook', 'leads'] },

    { id: 'tables', label: 'Tables', section: 'operations', icon: Users, keywords: ['tables', 'dine-in', 'seating'] },
    { id: 'rewards', label: 'Rewards', section: 'operations', icon: Gift, keywords: ['rewards', 'prizes', 'benefits'] },
    { id: 'delivery', label: 'Delivery', section: 'operations', icon: Truck, keywords: ['delivery', 'zones', 'persons', 'drivers', 'fees', 'bonus', 'milestone'] },

    { id: 'cashback-history', label: 'Cashback History', section: 'systems', group: 'Client Data', icon: History, keywords: ['cashback', 'history', 'transactions'] },
    { id: 'top-referrers', label: 'Top Referrers', section: 'systems', group: 'Client Data', icon: Trophy, keywords: ['top', 'referrers', 'leaderboard', 'rankings', 'genmo', 'month'] },
    { id: 'cashback-report', label: 'Cashback Report', section: 'systems', group: 'Client Data', icon: BarChart3, keywords: ['cashback', 'report', 'generated', 'paid', 'payout', 'monthly', 'summary', 'genmo'] },

    { id: 'clear-cache', label: 'Clear Cache', section: 'systems', group: 'Maintenance', permission: 'clear_cache_view', icon: RefreshCw, keywords: ['clear', 'cache', 'reload', 'refresh', 'update', 'version', 'troubleshoot'] },
    { id: 'cashback-rule-history', label: 'Rule History', section: 'systems', group: 'Maintenance', permission: 'rule_history_view', icon: History, keywords: ['cashback', 'rule', 'history', 'applied', 'orders'] },
    { id: 'audit', label: 'Audit Log', section: 'systems', group: 'Maintenance', icon: Activity, keywords: ['audit', 'log', 'activity', 'security'] },
    { id: 'branch-isolation', label: 'Branch Isolation & Sync', section: 'systems', group: 'Maintenance', icon: Shield, keywords: ['branch', 'isolation', 'sync', 'relink', 'mirror', 'recipes', 'menu', 'inventory', 'equipment', 'vehicles'] },
    { id: 'data-cleanup', label: 'Branch Reassignment', section: 'systems', group: 'Maintenance', icon: Database, keywords: ['branch', 'reassignment', 'reassign', 'unassigned', 'records'] },
    { id: 'cleanup', label: 'Go Live Cleanup', section: 'systems', group: 'Maintenance', icon: Rocket, keywords: ['cleanup', 'go', 'live', 'test', 'data'] },

    { id: 'data-clone', label: 'Data Clone', section: 'systems', group: 'Data Management', icon: Database, keywords: ['data', 'clone', 'export', 'import', 'backup', 'restore', 'migrate'] },
    { id: 'full-export', label: 'Full CSV Export', section: 'settings', group: 'Data Management', icon: Database, keywords: ['full', 'export', 'system', 'all', 'data', 'csv', 'zip', 'backup', 'archive', 'modules'] },
    { id: 'staff-backup', label: 'Staff Backup', section: 'systems', group: 'Data Management', icon: Database, keywords: ['staff', 'backup', 'export', 'user', 'employee', 'attendance', 'salary', 'csv'] },
  ];
  allTabsRef.current = allTabs;

  // Filter tabs based on search (hide admin-only tabs from non-admins)
  // and hide tabs whose module has been closed via the Modules manager.
  // Tabs carrying their own `permission` are gated by that flag alone, independent
  // of which section they now live in. Every other tab still requires its section flag.
  const hasTabPermission = (tab) => !tab.permission || isAdmin || !!permissions?.[tab.permission];

  const visibleTabs = allTabs.filter(
    tab => (tab.id !== 'modules' || isAdmin)
      // User & role management and full-database export run on platform-admin-only operations,
      // so these tabs are hidden from non-admin staff.
      && (!['users', 'roles', 'full-export'].includes(tab.id) || isAdmin)
      // Vendor details belong to the software vendor: safety-valve account only (server enforces too).
      && (tab.id !== 'vendor-support' || currentUser?.perm_is_safety_valve === true)
      // Closed with its module, or on its own as a sub-tab in Admin › Modules.
      && isModuleEnabled(moduleForTab(tab.id)) && isTabOpen("Admin", tab.id) && hasTabPermission(tab)
  );

  const sectionFlag = {
    settings: canAccessSettings,
    operations: canAccessOperations,
    systems: canAccessSystems,
  };

  // Tabs the user can actually open in a section: everything when they hold the
  // section flag, otherwise only the independently-permitted tabs.
  const tabsForSection = (section) =>
    visibleTabs.filter(t => t.section === section && (sectionFlag[section] || !!t.permission));

  // Every tab sits directly under the Admin panel; each keeps its section only
  // for access checks.
  const panelTabs = ['settings', 'systems', 'operations'].flatMap(tabsForSection);

  // Per-section active-trigger styling (full literal class strings so Tailwind keeps them).
  const sectionActiveClass = {
    settings: "data-[state=active]:bg-emerald-600 data-[state=active]:text-white",
    operations: "data-[state=active]:bg-blue-600 data-[state=active]:text-white",
    systems: "data-[state=active]:bg-purple-600 data-[state=active]:text-white",
    pos: "data-[state=active]:bg-slate-600 data-[state=active]:text-white",
    cashier: "data-[state=active]:bg-red-600 data-[state=active]:text-white",
    inventory: "data-[state=active]:bg-orange-600 data-[state=active]:text-white",
    purchases: "data-[state=active]:bg-slate-600 data-[state=active]:text-white",
    hr: "data-[state=active]:bg-teal-600 data-[state=active]:text-white",
  };

  const filteredTabs = searchQuery.trim() 
    ? visibleTabs.filter(tab => 
        tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tab.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSaveReward = async (data) => {
    if (editingReward) {
      await updateRewardMutation.mutateAsync({ id: editingReward.id, data });
    } else {
      await createRewardMutation.mutateAsync(data);
    }
  };

  const handleEditReward = (reward) => {
    setEditingReward(reward);
    setShowRewardForm(true);
  };

  const handleDeleteReward = (reward) => {
    setRewardToDelete(reward);
    setShowDeleteDialog(true);
  };

  const confirmDeleteReward = () => {
    if (rewardToDelete) {
      deleteRewardMutation.mutate(rewardToDelete.id);
      setShowDeleteDialog(false);
      setRewardToDelete(null);
    }
  };

  const categoryColors = {
    voucher: "bg-amber-100 text-amber-700",
    discount: "bg-emerald-100 text-emerald-700",
    free_item: "bg-violet-100 text-violet-700",
    experience: "bg-rose-100 text-rose-700"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                Admin Panel
              </h1>
              <p className="text-slate-500 mt-1">Manage rewards, users, and application settings</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3 w-full px-3 py-3 bg-white border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-slate-900">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search settings... (e.g., tax, service, rewards, users)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchQuery && filteredTabs.length > 0 && (
            <div className="mt-3 bg-white border rounded-lg shadow-lg p-3 space-y-2">
              <p className="text-xs text-slate-500 font-medium px-2">Found {filteredTabs.length} result{filteredTabs.length !== 1 ? 's' : ''}</p>
              {filteredTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-600" />
                      <div>
                        <p className="font-medium text-slate-900">{tab.label}</p>
                        {tab.group && <p className="text-xs text-slate-500">{tab.group}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Go to</Badge>
                  </button>
                );
              })}
            </div>
          )}

          {searchQuery && filteredTabs.length === 0 && (
            <div className="mt-3 bg-white border rounded-lg shadow-lg p-6 text-center">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>

        <AdminTrail
          activeTab={activeTab}
          tabs={panelTabs}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="space-y-3">
            {/* All admin tabs, grouped by sub-header */}
            <AdminTabStrip
              tabs={panelTabs}
              section="settings"
              activeClass={sectionActiveClass.settings}
            />
          </div>

          <ChunkErrorBoundary resetKey={activeTab}>
          <Suspense fallback={<p role="status" className="p-6 text-sm text-muted-foreground">Loading selected admin section…</p>}>
          {visibleTabs.some(tab => tab.id === activeTab && (sectionFlag[tab.section] || !!tab.permission)) ? <>
          {/* Branch Isolation & Sync Tab */}
          <TabsContent value="branch-isolation" className="space-y-4">
            <BranchIsolationWorkspace />
          </TabsContent>

          {/* Branch Reassignment Tab */}
          <TabsContent value="data-cleanup" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Bulk Branch Reassignment</h2>
              <p className="text-sm text-slate-500">Review and reassign unassigned records from selected modules to the default branch</p>
            </div>
            <BulkBranchReassignment />
          </TabsContent>

          {/* Registrations Tab */}
          <TabsContent value="registrations" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Admin Registration</h2>
              <p className="text-sm text-slate-500">Register new clients directly without approval process</p>
            </div>
            <AdminRegistrationSubmit />
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">New Registrations</h2>
              <p className="text-sm text-slate-500">Review and approve new client registrations after payment confirmation</p>
            </div>
            <ApprovalsCenterNotice what="Registrations and level upgrade requests" />
          </TabsContent>

          {/* Redemptions Tab */}
          <TabsContent value="redemptions" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Submit Redemption for Client</h2>
              <p className="text-sm text-slate-500">Redeem rewards on behalf of clients</p>
            </div>
            <AdminRedemptionSubmit />
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Redemption Requests</h2>
              <p className="text-sm text-slate-500">Review and approve client reward redemption requests</p>
            </div>
            <ApprovalsCenterNotice what="Redemption requests" />
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Manage Rewards</h2>
                <p className="text-sm text-slate-500">Create and edit rewards for clients to redeem</p>
              </div>
              <Button 
                onClick={() => {
                  setEditingReward(null);
                  setShowRewardForm(true);
                }}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Reward
              </Button>
            </div>

            <div className="grid gap-4">
              {rewards.length === 0 ? (
                <Card className="p-12 text-center border-0 shadow-sm">
                  <Gift className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="font-medium text-slate-900">No rewards yet</h3>
                  <p className="text-sm text-slate-500 mt-1">Create your first reward to get started</p>
                </Card>
              ) : (
                rewards.map((reward) => (
                  <Card key={reward.id} className="p-4 border-0 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <Gift className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-slate-900">{reward.name}</h3>
                            <p className="text-sm text-slate-500 mt-1">{reward.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={categoryColors[reward.category]}>
                                {reward.category?.replace("_", " ")}
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <PoundSterling className="w-3 h-3" />
                                {reward.cashback_cost} cashback
                              </Badge>
                              {!reward.is_redeemable && (
                                <Badge variant="destructive">Unavailable</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditReward(reward)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteReward(reward)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <PermissionGuard permission="users_manage">
              <UsersTabContent tabs={allTabs} />
            </PermissionGuard>
          </TabsContent>

          {/* Role Management Tab */}
          <TabsContent value="roles" className="space-y-6">
            <PermissionGuard permission="users_manage">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-1">Role Management</h2>
                <p className="text-sm text-slate-500">Create and manage role permission presets — changes here do not alter existing user assignments until applied</p>
              </div>
              <RoleManagement tabs={allTabs} />
            </PermissionGuard>
            {isAdmin && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-900">Approval Settings</h2>
                <AutoApprovalSetting />
              </div>
            )}
          </TabsContent>

          {/* SMS Notifications Tab */}
          <TabsContent value="sms-settings" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">SMS Notification Settings</h2>
              <p className="text-sm text-slate-500">Configure SMS alerts for orders, deliveries, and inventory</p>
            </div>
            <SMSPreferences />
          </TabsContent>



          {/* Social Media Connections Tab */}
          <TabsContent value="social-connections" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Social Media Connections</h2>
              <p className="text-sm text-slate-500">Capture leads from Facebook, Instagram, WhatsApp, TikTok and LinkedIn into CRM › Leads › Social leads</p>
            </div>
            <PermissionGuard permission="social_media_view">
              <SocialMediaConnections />
            </PermissionGuard>
          </TabsContent>

          {/* Cashback Settings Tab */}
          <TabsContent value="cashback" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Cashback Configuration</h2>
              <p className="text-sm text-slate-500">Set default cashback percentages based on referral tiers</p>
            </div>
            <CashbackSettings />
          </TabsContent>

          {/* Cashback Rules Tab */}
          <TabsContent value="cashback-rules" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Cashback Rules Engine</h2>
              <p className="text-sm text-slate-500">Define dynamic cashback rates by order type, customer tier, and promotional periods</p>
            </div>
            <CashbackRuleManagement />
          </TabsContent>

          {/* Registration Levels Tab */}
          <TabsContent value="reg-levels">
            <RegistrationLevelManagement />
          </TabsContent>

          {/* Loyalty Tiers Tab */}
          <TabsContent value="loyalty" className="space-y-4">
            <LoyaltyTierManagement />
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-4">
            <MilestoneManagement />
          </TabsContent>

          {/* Cashback Approvals Tab */}
          <TabsContent value="cashback-approvals" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Cashback Distribution Approvals</h2>
              <p className="text-sm text-slate-500">Review and approve automatic cashback distributions from completed orders</p>
            </div>
            <ApprovalsCenterNotice what="Cashback distributions" />
          </TabsContent>

          {/* Rule History Tab */}
          <TabsContent value="cashback-rule-history" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Cashback Rule Application History</h2>
              <p className="text-sm text-slate-500">View which cashback rules were applied to each order and review the rates used</p>
            </div>
            <PermissionGuard permission="rule_history_view">
              <CashbackRuleHistory />
            </PermissionGuard>
          </TabsContent>

          {/* Clear Cache Tab */}
          <TabsContent value="clear-cache" className="space-y-4">
            <PermissionGuard permission="clear_cache_view">
              <ClearCacheButton />
            </PermissionGuard>
          </TabsContent>

          {/* Categories Tab */}
           <TabsContent value="categories" className="space-y-4">
             <div>
               <h2 className="text-xl font-semibold text-slate-900 mb-1">Category Management</h2>
               <p className="text-sm text-slate-500">Create custom categories for organizing rewards</p>
             </div>
             <CategoryManagement />
           </TabsContent>

           {/* Timezone Tab */}
           <TabsContent value="vendor-support" className="space-y-4">
             <VendorSupportSettings />
           </TabsContent>

           {/* Support Customization Tab (formerly its own screen under Operations) */}
           <TabsContent value="support-customization" className="space-y-4">
             <PermissionGuard permission="support_customization">
               <SupportCustomizationWorkspace />
             </PermissionGuard>
           </TabsContent>

           <TabsContent value="timezone" className="space-y-4">
             <div>
               <h2 className="text-xl font-semibold text-slate-900 mb-1">System Timezone</h2>
               <p className="text-sm text-slate-500">Set the timezone for all timestamps in the application</p>
             </div>
             <TimezoneSettings />
             <ScheduleSettings />
           </TabsContent>

           {/* Language Preference Tab */}
           <TabsContent value="language-preference" className="space-y-4">
             <div>
               <h2 className="text-xl font-semibold text-slate-900 mb-1">Numeral Preferences</h2>
               <p className="text-sm text-slate-500">Choose whether numbers display as Arabic or English numerals across the whole app</p>
             </div>
             <LanguagePreferenceSettings />
           </TabsContent>

           {/* Printer Tab */}
          <TabsContent value="printer" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Printer Settings</h2>
              <p className="text-sm text-slate-500">Configure receipt printer and customize receipt design</p>
            </div>
            <PrinterSettings />
          </TabsContent>

          {/* Preparation Tab */}
          <TabsContent value="preparation" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Preparation Order Settings</h2>
              <p className="text-sm text-slate-500">Configure preparation areas, printers, and order tickets</p>
            </div>
            <PreparationAreaManagement />
            <PreparationSettings />
          </TabsContent>

          {/* Unit Conversions Tab */}
          <TabsContent value="unit-conversions" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">System-Wide Unit Conversions</h2>
              <p className="text-sm text-slate-500">Define global unit pairs and item-specific conversions applied across inventory, recipes, production, requisitions, and costing</p>
            </div>
            <UnitConversionSettings />
          </TabsContent>

          {/* Inventory Compliance Tab — follows the Settings tabs */}
          <TabsContent value="inventory-compliance" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Inventory Weight Compliance</h2>
              <p className="text-sm text-slate-500">Verify raw material purchases vs POS consumption vs current stock balance</p>
            </div>
            <InventoryWeightComplianceReport />
          </TabsContent>

          {/* KDS Settings Tab */}
          <TabsContent value="kds" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Kitchen Display System &amp; Requisition Limits</h2>
              <p className="text-sm text-slate-500">Configure audio alerts, notifications, and event additional requisition money allowances</p>
            </div>
            <ExtraItemsLimitSetting canEdit={isAdmin || permissions?.catering_settings_edit === true || permissions?.settings_edit === true} />
            <KDSSettings />
          </TabsContent>

          {/* Companies & Branches Tab */}
           <TabsContent value="companies" className="space-y-4">
             <CompaniesManager />
           </TabsContent>

          {/* Restaurant Info Tab */}
          <TabsContent value="restaurant" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Restaurant Information</h2>
              <p className="text-sm text-slate-500">Manage contact details and social media links</p>
            </div>
            <RestaurantInfoSettings />
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Default Root Client</h2>
              <p className="text-sm text-slate-500">Set the default referral for new registrations without a code</p>
            </div>
            <DefaultRootClientSettings />
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Payment Methods</h2>
              <p className="text-sm text-slate-500">Configure payment numbers for transfers</p>
            </div>
            <PaymentMethodSettings />

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Enabled Payment Methods</h2>
              <p className="text-sm text-slate-500">Choose which payment methods clients and cashiers can use</p>
            </div>
            <PaymentMethodsToggle />

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Stripe Payment Gateway</h2>
              <p className="text-sm text-slate-500">Accept credit card payments online through Stripe</p>
            </div>
            <StripePaymentGateway />
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4">
            <BrandingSettings />
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-4">
            {isAdmin ? <ModuleManagement tabs={allTabs} /> : (
              <Card className="p-8 text-center">
                <p className="text-slate-600">Only administrators can manage modules.</p>
              </Card>
            )}
          </TabsContent>






          {/* Tables Tab */}
          <TabsContent value="tables">
            <TableManagement />
          </TabsContent>

          {/* Cashback History Tab */}
          <TabsContent value="cashback-history" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Client Cashback History</h2>
              <p className="text-sm text-slate-500">Search and review detailed cashback transactions for any client</p>
            </div>
            <ClientCashbackHistory />
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Audit Log</h2>
              <p className="text-sm text-slate-500">View all administrator actions for security and accountability</p>
            </div>
            <AuditLogViewer />
          </TabsContent>

          {/* Go Live Cleanup Tab */}
          <TabsContent value="cleanup">
            <GoLiveCleanup />
          </TabsContent>

          {/* Top Referrers Tab */}
          <TabsContent value="top-referrers" className="space-y-4">
            <TopReferrersDashboard />
          </TabsContent>

          {/* Cashback Report Tab */}
          <TabsContent value="cashback-report" className="space-y-4">
            <CashbackMonthlyReport />
          </TabsContent>

          {/* Data Clone Tab */}
          <TabsContent value="data-clone" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Data Clone — Export & Import</h2>
              <p className="text-sm text-slate-500">Export selected modules to a JSON file or import from a previous export to clone data into this app</p>
            </div>
            <DataCloneManager />
          </TabsContent>

          {/* Full System Export Tab */}
          <TabsContent value="full-export" className="space-y-4">
            <FullSystemExport />
          </TabsContent>

          {/* Staff Backup Tab */}
          <TabsContent value="staff-backup" className="space-y-4">
            <StaffDataBackup />
          </TabsContent>

          {/* Email Settings Tab */}
          <TabsContent value="email">
            <EmailNotificationSettings />
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery" className="space-y-6">
            <AdminInnerTabs screen="AdminDelivery" tabs={[
              { key: "companies", label: "Companies", content: <DeliveryCompanyManagement /> },
              { key: "zones", label: "Zones", content: <DeliveryZoneManagement /> },
              { key: "persons", label: "Drivers", content: <DeliveryPersonManagement /> },
              { key: "bonus", label: "Bonus", content: <DeliveryBonusManager /> },
            ]} />
          </TabsContent>

          </> : <Card className="p-6 text-sm text-muted-foreground">Select an available section. This feature may be disabled or not permitted for your account.</Card>}


            </Suspense>
          </ChunkErrorBoundary>
        </Tabs>
      </div>

      {/* Delete Reward Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{rewardToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteReward}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Reward
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reward Form Dialog */}
      {showRewardForm && <Suspense fallback={<p role="status" className="p-4 text-sm text-muted-foreground">Loading reward form…</p>}><RewardForm
        open={showRewardForm}
        onOpenChange={(open) => {
          setShowRewardForm(open);
          if (!open) setEditingReward(null);
        }}
        reward={editingReward}
        onSave={handleSaveReward}
        isSaving={createRewardMutation.isPending || updateRewardMutation.isPending}
      /></Suspense>}
    </div>
  );
}