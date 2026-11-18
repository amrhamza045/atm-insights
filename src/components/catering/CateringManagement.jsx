import React, { useState, useEffect, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import ChunkErrorBoundary from "@/components/ChunkErrorBoundary";
import useCateringTrail from "./useCateringTrail";
import useSelectedEvent from "./useSelectedEvent";
import useEventBranchSync from "./useEventBranchSync";
import { PartyPopper, X } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";
import { Badge } from "@/components/ui/badge";
import { useCateringDiscountAccess } from "./useCateringDiscountAccess";
import { useCateringSettings } from "./useCateringSettings";
import CateringTabNav from "./CateringTabNav";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { CATERING_GROUPS as GROUPS, cateringUrl } from "./cateringTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";

const EventsTab = lazy(() => import("./EventsTab"));
const QuotesTab = lazy(() => import("./QuotesTab"));
const PaymentsTab = lazy(() => import("./PaymentsTab"));
const QuickActionsMenu = lazy(() => import("./quick/QuickActionsMenu"));
const QuickAccessTab = lazy(() => import("./quick/QuickAccessTab"));
const CateringOptionsTab = lazy(() => import("./CateringOptionsTab"));
const QuoteDocumentSettings = lazy(() => import("./QuoteDocumentSettings"));
const PaymentPoliciesTab = lazy(() => import("./payment-policies/PaymentPoliciesTab"));
const PlanningTab = lazy(() => import("./PlanningTab"));
const ShortfallQueue = lazy(() => import("./ShortfallQueue"));
const StaffingTab = lazy(() => import("./StaffingTab"));
const EquipmentTab = lazy(() => import("./EquipmentTab"));
const LogisticsTab = lazy(() => import("./LogisticsTab"));
const ExecutionTab = lazy(() => import("./ExecutionTab"));
const ReconciliationTab = lazy(() => import("./ReconciliationTab"));
const PortalAccessTab = lazy(() => import("./PortalAccessTab"));
const ApprovalsTab = lazy(() => import("./ApprovalsTab"));
const ReturnedTab = lazy(() => import("./ReturnedTab"));
const Invi222Tab = lazy(() => import("./Invi222Tab"));
const DiscountsTab = lazy(() => import("./DiscountsTab"));
const FeedbackTab = lazy(() => import("./FeedbackTab"));
const PackagesMediaTab = lazy(() => import("./PackagesMediaTab"));
const ConfirmOperationsTab = lazy(() => import("./confirm/ConfirmOperationsTab"));
const CalendarTab = lazy(() => import("./CalendarTab"));
const MailSettingsTab = lazy(() => import("./MailSettingsTab"));
const ReleaseSlipsTab = lazy(() => import("./ReleaseSlipsTab"));
const AllQuotesList = lazy(() => import("./all/AllQuotesList"));
const AllPaymentsList = lazy(() => import("./all/AllPaymentsList"));
const AllReconciliationsList = lazy(() => import("./all/AllReconciliationsList"));
const AllReturnedList = lazy(() => import("./all/AllReturnedList"));
const AllPlanningList = lazy(() => import("./all/AllPlanningList"));
const AllStaffingList = lazy(() => import("./all/AllStaffingList"));
const AllTripsList = lazy(() => import("./all/AllTripsList"));
const AllExecutionList = lazy(() => import("./all/AllExecutionList"));
const AllConfirmList = lazy(() => import("./all/AllConfirmList"));

export default function CateringManagement() {
  // The address is the single source of truth for the open tab and event, so
  // every tab change is a real navigation step (Back / Forward / Up use it).
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const requestedTab = params.get("tab");
  const selectedEventId = params.get("event_id");
  // Remembers the last sub-tab visited inside each parent for this session.
  const [lastTabByGroup, setLastTabByGroup] = useState({});
  const [autoOpenQuote, setAutoOpenQuote] = useState(false);
  const [autoOpenNewEvent, setAutoOpenNewEvent] = useState(false);
  const { selectedBranch, selectedBranchId } = useBranch();
  const { canManageDiscounts } = useCateringDiscountAccess();
  const { logisticsEnabled } = useCateringSettings();
  const { permissions, currentUser } = usePermissions();
  const { isModuleEnabled, isTabOpen } = useModuleAccess();
  // POS keeps its own permission and module gates now that it lives here as a tab.
  const isAdmin = useIsAdmin();
  const canAccessPOS = (isAdmin || permissions?.pos_view || permissions?.pos_access) && isModuleEnabled("pos");
  // Existing gates carry over unchanged, wherever the tab now sits.
  const gateAllows = (gate) => {
    if (gate === "logistics") return logisticsEnabled;
    if (gate === "discounts") return canManageDiscounts;
    if (gate === "pos") return canAccessPOS;
    return true;
  };
  const visibleGroups = GROUPS
    // Leaves out tabs closed in Admin › Modules, for this account's role or for this user.
    .map((g) => ({ ...g, tabs: g.tabs.filter((t) => gateAllows(t.gate) && isTabOpen("Catering", t.key)) }))
    .filter((g) => g.tabs.length > 0);

  const hasTab = (key) => visibleGroups.some((g) => g.tabs.some((t) => t.key === key));
  const homeTab = hasTab("events") ? "events" : visibleGroups[0]?.tabs[0]?.key;
  const activeAllowed = hasTab(requestedTab);
  const activeTab = activeAllowed ? requestedTab : homeTab;
  const activeGroup = visibleGroups.find((g) => g.tabs.some((t) => t.key === activeTab))?.key;
  const openTab = (tab, eventId = selectedEventId) => navigate(cateringUrl(tab, eventId));

  // No tab (or a hidden one) in the address: settle on the starting tab,
  // replacing the address so it isn't a separate Back step.
  useEffect(() => {
    // Assets and Resources moved to the Operations menu; old links follow it.
    if (requestedTab === "costs") {
      navigate("/AssetsResources", { replace: true });
      return;
    }
    if (activeAllowed || !homeTab) return;
    navigate(cateringUrl(homeTab, selectedEventId), { replace: true });
  }, [activeAllowed, homeTab, requestedTab]);

  useEffect(() => {
    if (!activeGroup) return;
    setLastTabByGroup((prev) => (prev[activeGroup] === activeTab ? prev : { ...prev, [activeGroup]: activeTab }));
  }, [activeGroup, activeTab]);

  const handleSelectGroup = (groupKey) => {
    const group = visibleGroups.find((g) => g.key === groupKey);
    if (!group) return;
    const remembered = lastTabByGroup[groupKey];
    openTab(group.tabs.some((t) => t.key === remembered) ? remembered : group.tabs[0].key);
  };

  const handleSelectTab = (tabKey) => openTab(tabKey);

  // Jump straight to a tab even when it lives in another parent group.
  const handleSelectTabAcrossGroups = (tabKey) => {
    if (hasTab(tabKey)) openTab(tabKey);
  };

  // Only the event in the address is read here; each tab loads its own list for the dates it shows.
  const selectedEvent = useSelectedEvent(selectedEventId);
  // The open event and the branch picked at the top always agree.
  useEventBranchSync(selectedEvent, () => navigate(cateringUrl(activeTab), { replace: true }));

  useCateringTrail({ groups: visibleGroups, activeGroup, activeTab, eventId: selectedEventId, event: selectedEvent, homeTab });

  const handleSelectEvent = (id) => openTab("quotes", id);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <PartyPopper className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xl font-bold text-slate-900 flex-shrink-0">Catering</h1>
        {selectedEvent && (
          <Badge
            className="min-w-0 max-w-xl px-4 py-1 flex items-center gap-2 border"
            style={{ color: "#fd7e02", backgroundColor: "#fff4e8", borderColor: "#fdc78f" }}
          >
            <span className="truncate">Scoped to: {selectedEvent.event_name}</span>
            <button
              onClick={() => openTab(activeTab, null)}
              aria-label="Clear selected event"
              className="flex-shrink-0 w-5 h-5 rounded-full text-white flex items-center justify-center hover:opacity-90"
              style={{ backgroundColor: "#fd7e02" }}
            >
              <X className="w-3.5 h-3.5" strokeWidth={3} />
            </button>
          </Badge>
        )}
          </div>
        </div>
      </div>

      {visibleGroups.length === 0 && <ClosedTabsNotice />}

      <CateringTabNav
        groups={visibleGroups}
        activeGroup={activeGroup}
        activeTab={activeTab}
        onSelectGroup={handleSelectGroup}
        onSelectTab={handleSelectTab}
      />

      <ChunkErrorBoundary resetKey={activeTab}>
      <Suspense fallback={<div role="status" className="p-8 text-center text-sm text-slate-500">Loading Catering section…</div>}>
      {activeTab === "quick" && (
        <QuickAccessTab
          hasTab={hasTab}
          onOpenTab={handleSelectTabAcrossGroups}
          onNewEvent={() => { setAutoOpenNewEvent(true); openTab("events"); }}
        />
      )}
      {activeTab === "events" && (
        <EventsTab
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
          autoOpenNew={autoOpenNewEvent}
          onAutoOpened={() => setAutoOpenNewEvent(false)}
          quickActions={
            <QuickActionsMenu
              onQuoteExisting={(id) => { handleSelectEvent(id); setAutoOpenQuote(true); }}
              onQuoteCreated={(id) => handleSelectEvent(id)}
              onRecordDeposit={(id) => openTab("payments", id)}
            />
          }
        />
      )}
      {activeTab === "calendar" && (
        <CalendarTab
          onOpenEvent={(id) => openTab("events", id)}
        />
      )}
      {/* With no event in the address, the event-level tabs below list every event's records in the branch. */}
      {activeTab === "quotes" && (selectedEventId
        ? <QuotesTab event={selectedEvent} autoOpenNew={autoOpenQuote} onAutoOpened={() => setAutoOpenQuote(false)} />
        : <AllQuotesList />)}
      {activeTab === "approvals" && <ApprovalsTab onSelectEvent={handleSelectEvent} />}
      {activeTab === "payments" && (selectedEventId ? <PaymentsTab event={selectedEvent} /> : <AllPaymentsList />)}
      {activeTab === "planning" && (selectedEventId ? <PlanningTab event={selectedEvent} /> : <AllPlanningList />)}
      {activeTab === "release-slips" && <ReleaseSlipsTab eventId={selectedEvent ? selectedEventId : null} />}
      {activeTab === "shortfalls" && <ShortfallQueue eventId={selectedEvent ? selectedEventId : null} />}
      {activeTab === "staffing" && (selectedEventId ? <StaffingTab event={selectedEvent} /> : <AllStaffingList />)}
      {activeTab === "equipment" && <EquipmentTab event={selectedEvent} />}
      {activeTab === "logistics" && logisticsEnabled && (selectedEventId ? <LogisticsTab event={selectedEvent} /> : <AllTripsList />)}
      {activeTab === "execution" && (selectedEventId ? <ExecutionTab event={selectedEvent} /> : <AllExecutionList />)}
      {activeTab === "returned" && (selectedEventId ? <ReturnedTab event={selectedEvent} /> : <AllReturnedList />)}
      {activeTab === "reconciliation" && (selectedEventId ? <ReconciliationTab event={selectedEvent} /> : <AllReconciliationsList />)}
      {activeTab === "packages" && <PackagesMediaTab packageId={params.get("package_id")} />}
      {activeTab === "invi222" && <Invi222Tab event={selectedEvent} browseAll={!selectedEventId} />}
      {activeTab === "portal" && <PortalAccessTab event={selectedEvent} />}
      {activeTab === "discounts" && canManageDiscounts && <DiscountsTab event={selectedEvent} />}
      {activeTab === "feedback" && canManageDiscounts && <FeedbackTab eventId={selectedEventId} scopedEvent={selectedEvent} />}
      {activeTab === "settings" && <CateringOptionsTab />}
      {activeTab === "quote-settings" && <QuoteDocumentSettings />}
      {activeTab === "payment-policies" && <PaymentPoliciesTab />}
      {activeTab === "mail" && <MailSettingsTab />}
      {activeTab === "pos" && canAccessPOS && (selectedEventId
        ? <ConfirmOperationsTab event={selectedEvent} onGoToTab={handleSelectTabAcrossGroups} />
        : <AllConfirmList />)}
      </Suspense>
      </ChunkErrorBoundary>
    </div>
  );
}