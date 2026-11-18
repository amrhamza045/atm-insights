import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeCall, financeError } from "@/components/finance/financeApi";
import { toast } from "sonner";
import PayoutRow from "@/components/finance/PayoutRow";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PayoutSourceSelect from "@/components/finance/payouts/PayoutSourceSelect";
import { Button } from "@/components/ui/button";
import { Landmark } from "lucide-react";

export default function PayrollPayouts({ company }) {
  const qc = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["hrPayouts", company.id],
    queryFn: () => financeCall({ action: "hr_payouts", company_id: company.id }),
  });

  const confirm = useMutation({
    mutationFn: (payload) => financeCall({ action: "hr_payout_confirm", company_id: company.id, ...payload }),
    onSuccess: (res) => { toast.success(`Confirmed ${res.posted} payout(s)`); qc.invalidateQueries({ queryKey: ["hrPayouts"] }); qc.invalidateQueries({ queryKey: ["finance"] }); },
    onError: (e) => toast.error(financeError(e)),
  });

  const prepareMissing = useMutation({
    mutationFn: () => financeCall({ action: "prepare_operational_backlog", company_id: company.id }),
    onSuccess: (res) => { toast.success(`Prepared ${res.prepared || 0} review journal(s)`); qc.invalidateQueries({ queryKey: ["hrPayouts"] }); qc.invalidateQueries({ queryKey: ["finance"] }); },
    onError: (e) => toast.error(financeError(e)),
  });

  const [batchSourceType, setBatchSourceType] = useState('payment_method');
  const [batchSourceId, setBatchSourceId] = useState(null);

  if (isPending) return <p className="text-sm p-4">Loading payouts…</p>;
  if (error) return <p className="text-sm text-destructive p-4">{financeError(error)}</p>;

  const { items = [], payment_methods = [], custodies = [] } = data;
  const payrolls = items.filter(i => i._entity === "PayrollDisbursement");
  const advances = items.filter(i => i._entity === "EmployeeBorrowing");

  const renderSection = (title, rows) => {
    if (rows.length === 0) return <p className="text-sm text-muted-foreground my-4">No payouts found.</p>;
    
    // Group by month
    const groups = rows.reduce((acc, row) => {
      const g = (row._entity === "EmployeeBorrowing" ? row.borrow_date?.slice(0, 7) : row.month?.slice(0, 7)) || "Older";
      if (!acc[g]) acc[g] = [];
      acc[g].push(row);
      return acc;
    }, {});

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).map(([g, groupRows]) => {
      const paid = groupRows.filter(r => (r._entity === "EmployeeBorrowing" ? r.payout_status : r.status) === "paid");
      const ready = groupRows.filter(r => r.approval_status === "approved" && (r._entity === "EmployeeBorrowing" ? r.payout_status : r.status) !== "paid");
      const total = groupRows.reduce((s, r) => s + (r.amount || 0), 0);
      const readyTotal = ready.reduce((s, r) => s + (r.amount || 0), 0);

      return (
        <div key={g} className="space-y-2 mt-4">
          <div className="flex flex-wrap justify-between items-center bg-slate-100 rounded px-3 py-2 text-sm font-semibold text-slate-800">
            <span>{g} · {paid.length}/{groupRows.length} paid</span>
            <span>Total EGP {total.toFixed(2)}</span>
          </div>
          
          {ready.length > 1 && (
            <div className="flex flex-wrap items-center gap-3 bg-blue-50/50 p-2 rounded border border-blue-100">
              <span className="text-xs font-medium text-blue-800 flex-1">Batch pay {ready.length} ready items (EGP {readyTotal.toFixed(2)})</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="w-[300px]">
                  <PayoutSourceSelect type={batchSourceType} value={batchSourceId} onChange={(id, t) => { setBatchSourceType(t); if(id!==undefined)setBatchSourceId(id); else setBatchSourceId(null); }} disabled={confirm.isPending} methods={payment_methods} custodies={custodies} requiredAmount={readyTotal} />
                </div>
                <Button size="sm" onClick={() => confirm.mutate({ items: ready, source_id: batchSourceId, payout_source_type: batchSourceType })} disabled={!batchSourceId || confirm.isPending} className="bg-blue-600 hover:bg-blue-700 h-8 shrink-0">Pay {ready.length} items</Button>
              </div>
            </div>
          )}

          <div className="divide-y border rounded-lg px-3">
            {groupRows.map((d) => (
              <PayoutRow key={d.id} payout={d} canPay={true} busy={confirm.isPending} onConfirm={confirm.mutate} methods={payment_methods} custodies={custodies} />
            ))}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted p-3 rounded-md text-sm border space-y-2">
        <strong className="flex items-center gap-2"><Landmark className="w-4 h-4"/> Post-Approval Payout Routing</strong>
        <p className="text-muted-foreground">After Finance approves an HR accrual or advance journal in <strong>Pending review</strong>, select any active <strong>Payment Method</strong> or <strong>Staff Custody</strong> (insufficient custody balances are blocked) to disburse it.</p>
        {items.some((i) => i.approval_status === "missing_proposal") && (
          <Button size="sm" variant="outline" disabled={prepareMissing.isPending} onClick={() => prepareMissing.mutate()}>
            {prepareMissing.isPending ? "Preparing…" : "Prepare missing review journals"}
          </Button>
        )}
      </div>
      
      <Tabs defaultValue="payrolls">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="payrolls" className="flex-1 sm:flex-none">Salaries & Event Labor</TabsTrigger>
          <TabsTrigger value="advances" className="flex-1 sm:flex-none">Employee Advances</TabsTrigger>
        </TabsList>
        <TabsContent value="payrolls">{renderSection("Payroll & Event Labor", payrolls)}</TabsContent>
        <TabsContent value="advances">{renderSection("Employee Advances", advances)}</TabsContent>
      </Tabs>
    </div>
  );
}