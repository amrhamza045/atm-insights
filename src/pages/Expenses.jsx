import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle2, Settings } from "lucide-react";
import { toast } from "sonner";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { useBranch } from "@/components/branches/BranchContext";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import { treasuryCall, treasuryError } from "@/components/treasury/treasuryApi";
import CompanyBar from "@/components/treasury/CompanyBar";
import ExpenseDisbursementsTab from "@/components/treasury/expenses/ExpenseDisbursementsTab";
import ExpenseApprovalsTab from "@/components/treasury/expenses/ExpenseApprovalsTab";
import ExpenseTypesConfigTab from "@/components/treasury/expenses/ExpenseTypesConfigTab";
import ExpenseDisbursementDialog from "@/components/treasury/expenses/ExpenseDisbursementDialog";

const TAB_KEYS = ["disbursements", "approvals", "configuration"];

export default function Expenses() {
  const qc = useQueryClient();
  const { selectedBranchId } = useBranch();
  const { currentUser } = usePermissions();
  const screenTabs = useScreenTabs("Expenses");

  const [tab, setTab] = useState("disbursements");
  const [companyId, setCompanyId] = useState("");
  const [newKind, setNewKind] = useState(null);

  const shownTab = screenTabs.pick(tab, TAB_KEYS);

  const { data, isPending, error } = useQuery({
    queryKey: ["treasury", "expenses", companyId, selectedBranchId],
    queryFn: () =>
      treasuryCall({
        action: "expenses_workspace",
        ...(companyId ? { company_id: companyId } : {}),
        ...(selectedBranchId ? { branch_id: selectedBranchId } : {}),
      }),
  });

  const submitMutation = useMutation({
    mutationFn: (payload) =>
      treasuryCall({
        action: "expense_disbursement_submit",
        company_id: data?.company?.id,
        ...payload,
      }),
    onSuccess: () => {
      toast.success("Disbursement submitted for Role Group approval");
      qc.invalidateQueries({ queryKey: ["treasury"] });
      setNewKind(null);
    },
    onError: (e) => toast.error(treasuryError(e)),
  });

  const decideMutation = useMutation({
    mutationFn: ({ payload, done }) =>
      treasuryCall({
        action: "expense_disbursement_decide",
        company_id: data?.company?.id,
        ...payload,
      }).then((res) => {
        if (done) done();
        return res;
      }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.payload.decision === "approve"
          ? "Disbursement approved and posted to General Ledger"
          : "Disbursement rejected"
      );
      qc.invalidateQueries({ queryKey: ["treasury"] });
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e) => toast.error(treasuryError(e)),
  });

  const saveTypeMutation = useMutation({
    mutationFn: ({ payload, done }) =>
      treasuryCall({
        action: "expense_type_save",
        company_id: data?.company?.id,
        ...payload,
      }).then((res) => {
        if (done) done();
        return res;
      }),
    onSuccess: () => {
      toast.success("Expense type & GL account mapping saved");
      qc.invalidateQueries({ queryKey: ["treasury"] });
    },
    onError: (e) => toast.error(treasuryError(e)),
  });

  const toggleTypeMutation = useMutation({
    mutationFn: (payload) =>
      treasuryCall({
        action: "expense_type_toggle",
        company_id: data?.company?.id,
        ...payload,
      }),
    onSuccess: () => {
      toast.success("Expense type status updated");
      qc.invalidateQueries({ queryKey: ["treasury"] });
    },
    onError: (e) => toast.error(treasuryError(e)),
  });

  if (isPending) {
    return <div className="max-w-7xl mx-auto p-6 text-sm text-muted-foreground">Loading Expenses module…</div>;
  }
  if (error) {
    return <div className="max-w-7xl mx-auto p-6 text-sm text-destructive">{treasuryError(error)}</div>;
  }
  if (data?.no_company) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Create an active accounting company in <strong>Admin › Companies</strong> first to manage Expenses.
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingCount = (data.disbursements || []).filter((d) => d.status === "pending").length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
            <Receipt className="w-7 h-7" /> Expenses & Disbursements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standalone treasury disbursements: pay operating expenses or settle vendor balances from Staff Custody or Payment Methods, with configurable expense types and GL mappings.
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
            {screenTabs.isOpen("disbursements") && (
              <TabsTrigger value="disbursements" className="gap-1.5">
                <Receipt className="w-4 h-4" /> Disbursements & Vendor Payments
              </TabsTrigger>
            )}
            {screenTabs.isOpen("approvals") && (
              <TabsTrigger value="approvals" className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Pending Approvals
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            {screenTabs.isOpen("configuration") && (
              <TabsTrigger value="configuration" className="gap-1.5">
                <Settings className="w-4 h-4" /> Expense Types & Accounts
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="disbursements">
            <ExpenseDisbursementsTab
              disbursements={data.disbursements}
              currency={data.company?.currency}
              canEdit={data.permissions?.can_edit}
              onOpenNew={(kind) => setNewKind(kind)}
            />
          </TabsContent>

          <TabsContent value="approvals">
            <ExpenseApprovalsTab
              disbursements={data.disbursements}
              currency={data.company?.currency}
              canApprove={data.permissions?.can_approve}
              selfBypass={data.permissions?.self_bypass}
              currentUserEmail={currentUser?.email}
              busy={decideMutation.isPending}
              onDecide={(payload, done) => decideMutation.mutate({ payload, done })}
            />
          </TabsContent>

          <TabsContent value="configuration">
            <ExpenseTypesConfigTab
              expenseTypes={data.expense_types}
              expenseAccounts={data.expense_accounts}
              canConfigure={data.permissions?.can_configure}
              busy={saveTypeMutation.isPending || toggleTypeMutation.isPending}
              onSaveType={(payload, done) => saveTypeMutation.mutate({ payload, done })}
              onToggleType={(payload) => toggleTypeMutation.mutate(payload)}
            />
          </TabsContent>
        </Tabs>
      )}

      {newKind && (
        <ExpenseDisbursementDialog
          initialKind={newKind}
          branches={data.branches}
          defaultBranchId={data.selected_branch_id}
          expenseTypes={data.expense_types}
          custodies={data.custodies}
          paymentMethods={data.payment_methods}
          suppliers={data.suppliers}
          openInvoices={data.open_invoices}
          currency={data.company?.currency}
          vendorApMapped={data.vendor_ap_mapped}
          busy={submitMutation.isPending}
          onClose={() => setNewKind(null)}
          onSubmit={(payload) => submitMutation.mutate(payload)}
        />
      )}
    </div>
  );
}