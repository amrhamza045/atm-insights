import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Settings, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { useBranch } from "@/components/branches/BranchContext";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import { treasuryCall, treasuryError } from "@/components/treasury/treasuryApi";
import CompanyBar from "@/components/treasury/CompanyBar";
import CustodyBalancesTab from "@/components/treasury/custody/CustodyBalancesTab";
import CustodyRequestsTab from "@/components/treasury/custody/CustodyRequestsTab";
import CustodyConfigTab from "@/components/treasury/custody/CustodyConfigTab";
import CustodyRequestDialog from "@/components/treasury/custody/CustodyRequestDialog";

const TAB_KEYS = ["balances", "requests", "configuration"];

export default function PettyCashCustody() {
  const qc = useQueryClient();
  const { selectedBranchId } = useBranch();
  const { currentUser } = usePermissions();
  const screenTabs = useScreenTabs("PettyCashCustody");

  const [tab, setTab] = useState("balances");
  const [companyId, setCompanyId] = useState("");
  const [requestDialog, setRequestDialog] = useState(null);

  const shownTab = screenTabs.pick(tab, TAB_KEYS);

  const { data, isPending, error } = useQuery({
    queryKey: ["treasury", "custody", companyId, selectedBranchId],
    queryFn: () =>
      treasuryCall({
        action: "custody_workspace",
        ...(companyId ? { company_id: companyId } : {}),
        ...(selectedBranchId ? { branch_id: selectedBranchId } : {}),
      }),
  });

  const submitMutation = useMutation({
    mutationFn: (payload) =>
      treasuryCall({
        action: "custody_request_submit",
        company_id: data?.company?.id,
        ...payload,
      }),
    onSuccess: () => {
      toast.success("Custody request submitted for Role Group approval");
      qc.invalidateQueries({ queryKey: ["treasury"] });
      setRequestDialog(null);
    },
    onError: (e) => toast.error(treasuryError(e)),
  });

  const decideMutation = useMutation({
    mutationFn: ({ payload, done }) =>
      treasuryCall({
        action: "custody_request_decide",
        company_id: data?.company?.id,
        ...payload,
      }).then((res) => {
        if (done) done();
        return res;
      }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.payload.decision === "approve"
          ? "Custody request approved and posted to General Ledger"
          : "Custody request rejected"
      );
      qc.invalidateQueries({ queryKey: ["treasury"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["hrPayouts"] });
    },
    onError: (e) => toast.error(treasuryError(e)),
  });

  const configMutation = useMutation({
    mutationFn: (payload) =>
      treasuryCall({
        action: "custody_config_save",
        company_id: data?.company?.id,
        ...payload,
      }),
    onSuccess: () => {
      toast.success("Unified Custody GL summary account saved");
      qc.invalidateQueries({ queryKey: ["treasury"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e) => toast.error(treasuryError(e)),
  });

  if (isPending) {
    return <div className="max-w-7xl mx-auto p-6 text-sm text-muted-foreground">Loading Petty Cash & Custody…</div>;
  }
  if (error) {
    return <div className="max-w-7xl mx-auto p-6 text-sm text-destructive">{treasuryError(error)}</div>;
  }
  if (data?.no_company) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Create an active accounting company in <strong>Admin › Companies</strong> first to manage Petty Cash & Custody.
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingCount = (data.requests || []).filter((r) => r.status === "pending").length;
  const activeCustodies = (data.custodies || []).filter((c) => c.status === "active");

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
            <Wallet className="w-7 h-7" /> Petty Cash & Custody
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standalone treasury custody management: funding requests, per-person balances, settlements, and unified GL summary configuration.
          </p>
        </div>
        <CompanyBar
          companies={data.companies}
          company={data.company}
          onSelectCompany={setCompanyId}
        />
      </div>

      {!shownTab ? (
        <ClosedTabsNotice />
      ) : (
        <Tabs value={shownTab} onValueChange={setTab} className="space-y-5">
          <TabsList className="flex-wrap h-auto">
            {screenTabs.isOpen("balances") && (
              <TabsTrigger value="balances" className="gap-1.5">
                <Wallet className="w-4 h-4" /> Balances & Ledger
              </TabsTrigger>
            )}
            {screenTabs.isOpen("requests") && (
              <TabsTrigger value="requests" className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Requests & Settlements
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {screenTabs.isOpen("configuration") && (
              <TabsTrigger value="configuration" className="gap-1.5">
                <Settings className="w-4 h-4" /> Configuration
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="balances">
            <CustodyBalancesTab
              custodies={data.custodies}
              entries={data.entries}
              currency={data.company?.currency}
              canManage={data.permissions?.can_manage}
              bindingMapped={Boolean(data.custody_binding)}
              onOpenRequest={setRequestDialog}
            />
          </TabsContent>

          <TabsContent value="requests">
            <CustodyRequestsTab
              requests={data.requests}
              currency={data.company?.currency}
              canApprove={data.permissions?.can_approve}
              selfBypass={data.permissions?.self_bypass}
              currentUserEmail={currentUser?.email}
              busy={decideMutation.isPending}
              onDecide={(payload, done) => decideMutation.mutate({ payload, done })}
            />
          </TabsContent>

          <TabsContent value="configuration">
            <CustodyConfigTab
              binding={data.custody_binding}
              assetAccounts={data.asset_accounts}
              paymentMethods={data.payment_methods}
              canConfigure={data.permissions?.can_configure}
              busy={configMutation.isPending}
              onSave={(payload) => configMutation.mutate(payload)}
            />
          </TabsContent>
        </Tabs>
      )}

      {requestDialog && (
        <CustodyRequestDialog
          dialog={requestDialog}
          employees={data.employees}
          activeCustodies={activeCustodies}
          paymentMethods={data.payment_methods}
          currency={data.company?.currency}
          busy={submitMutation.isPending}
          onClose={() => setRequestDialog(null)}
          onSubmit={(payload) => submitMutation.mutate(payload)}
        />
      )}
    </div>
  );
}