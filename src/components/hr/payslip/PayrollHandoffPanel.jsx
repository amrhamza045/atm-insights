import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Landmark, Send } from "lucide-react";
import { toast } from "sonner";

/** HR sends the month's salary list to Finance and follows who has been paid. */
export default function PayrollHandoffPanel({ month, branchId, salaryRecords }) {
  const qc = useQueryClient();
  const key = ["payrollDisbursements", month, branchId];

  const { data: items = [] } = useQuery({
    queryKey: key,
    queryFn: () => base44.entities.PayrollDisbursement.filter({ month: `${month}-01`, ...(branchId ? { branch_id: branchId } : {}) }),
  });

  const unsent = salaryRecords.filter((r) => !items.some((d) => d.employee_id === r.employee_id));

  const { data: companies = [] } = useQuery({ queryKey: ["financeCompanies"], queryFn: () => base44.entities.FinanceCompany.list() });

  const submit = useMutation({
    mutationFn: async () => {
      const company = companies.find(c => (c.branch_ids || []).includes(branchId || unsent[0]?.branch_id));
      if (!company) throw new Error("Branch has no Finance company assigned.");
      return base44.functions.invoke('hrPayrollHandoff', { month, branch_id: branchId, company_id: company.id });
    },
    onSuccess: () => { toast.success("Payroll sent to Finance"); qc.invalidateQueries({ queryKey: ["payrollDisbursements"] }); },
    onError: (e) => toast.error("Could not send to Finance: " + (e.response?.data?.error || e.message)),
  });

  if (salaryRecords.length === 0) return null;
  const paid = items.filter((d) => d.status === "paid").length;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <p className="font-semibold flex items-center gap-2"><Landmark className="w-4 h-4" /> Finance payout</p>
            <p className="text-xs text-slate-500">
              {items.length === 0 ? "Not sent to Finance yet." : `${paid} of ${items.length} employees paid by Finance.`}
            </p>
          </div>
          {unsent.length > 0 && (
            <Button size="sm" className="gap-1" disabled={submit.isPending} onClick={() => submit.mutate()}>
              <Send className="w-3 h-3" />{submit.isPending ? "Sending..." : `Send to Finance (${unsent.length})`}
            </Button>
          )}
        </div>
        {items.length > 0 && (
          <div className="divide-y">
            {items.map((d) => (
              <div key={d.id} className="py-1.5 flex items-center gap-3 text-sm">
                <span className="flex-1 font-medium">{d.employee_name}</span>
                <span className="text-slate-600">EGP {(d.amount || 0).toFixed(2)}</span>
                <Badge className={d.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                  {d.status === "paid" ? "Paid / delivered" : "Awaiting Finance"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}