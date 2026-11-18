import React from "react";
import { Users } from "lucide-react";
import ClientsWorkspace from "@/components/crm/ClientsWorkspace";
import LeadsWorkspace from "@/components/crm/LeadsWorkspace";
import MyFollowUpsPanel from "@/components/crm/MyFollowUpsPanel";
import MarketingCampaigns from "@/components/admin/MarketingCampaigns";
import ReferralsTab from "@/components/catering/ReferralsTab";
import ReferralsOnlyView from "@/components/crm/ReferralsOnlyView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import useTabTrail from "@/lib/useTabTrail";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";

export default function CRM() {
  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();

  // Marketing Team is a CRM-only role — it gets everything inside the CRM,
  // and nothing outside it (their permission record grants no other module).
  // "Full CRM access" opens every CRM panel and action.
  const fullCrm = isAdmin || !!permissions?.crm_full_view;

  const canAccess = fullCrm || permissions?.clients_view;
  const access = {
    financials: fullCrm || !!permissions?.financial_view,
    catering: fullCrm || !!permissions?.catering_view,
    logInteractions: fullCrm || !!permissions?.clients_edit,
    // Editing and deleting client records keeps its original Admin › Systems
    // gate — deliberately NOT part of the full-CRM role.
    manageClients: isAdmin || !!permissions?.admin_systems,
    // Merging re-points events and payments between people — stricter than
    // clients_edit, so it gets its own flag (admins always allowed).
    mergeClients: isAdmin || !!permissions?.clients_merge,
  };
  const canManageLeads = fullCrm || permissions?.clients_edit;
  // Campaigns can mass-send email/notifications — gated by the "Campaigns & Loyalty Requests" flag.
  const canManageCampaigns = fullCrm || permissions?.admin_actions;
  // Catering carve-out: catering people see Referrals without gaining any other CRM tab.
  const canSeeReferrals = fullCrm || !!permissions?.clients_view || !!permissions?.catering_view;

  // Tab lives in the address; tabs closed in Admin › Modules are left out.
  const { keep } = useScreenTabs("CRM");
  const tabs = keep([
    { key: "clients", label: "Clients" },
    { key: "leads", label: "Leads" },
    { key: "followups", label: "Follow-ups" },
    ...(canSeeReferrals ? [{ key: "referrals", label: "Referrals" }] : []),
    ...(canManageCampaigns ? [{ key: "campaigns", label: "Campaigns" }] : []),
  ]);
  const [tab, setTab] = useTabTrail(tabs);

  if (!canAccess && canSeeReferrals) {
    return <ReferralsOnlyView />;
  }

  if (!canAccess) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-slate-600">You don't have access to client records.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-slate-700" />
        <h1 className="text-xl font-bold text-slate-900">CRM</h1>
      </div>

      {tabs.length === 0 ? <ClosedTabsNotice /> : (
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          {tabs.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <ClientsWorkspace access={access} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <LeadsWorkspace canManage={canManageLeads} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="followups" className="space-y-4 mt-4">
          <p className="text-sm text-slate-500">
            Follow-ups from interactions you logged. Overdue items are highlighted in red.
          </p>
          <MyFollowUpsPanel currentUser={currentUser} />
        </TabsContent>

        {canSeeReferrals && (
          <TabsContent value="referrals" className="space-y-4 mt-4">
            <p className="text-sm text-slate-500">
              Referrals guests send from their event pass. When one converts, record the referrer's commission for the
              event they booked, and mark it paid once you've paid them.
            </p>
            <ReferralsTab />
          </TabsContent>
        )}

        {canManageCampaigns && (
          <TabsContent value="campaigns" className="space-y-4 mt-4">
            <MarketingCampaigns />
          </TabsContent>
        )}
      </Tabs>
      )}
    </div>
  );
}