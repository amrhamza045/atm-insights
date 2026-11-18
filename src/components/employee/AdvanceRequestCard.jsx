import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import AdvanceHistory from "@/components/hr/borrowings/AdvanceHistory";
import { policyError } from "@/components/hr/borrowings/BorrowingWindowPicker";

const EMPTY = { amount: "", reason: "", borrow_date: "", repayment_type: "installments", installment_months: 1 };

// Employee self-service salary-advance request. Renders nothing for accounts without an employee record.
export default function AdvanceRequestCard() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const { data, isLoading } = useQuery({
    queryKey: ["myAdvanceOptions"],
    queryFn: () => base44.functions.invoke("employeeBorrowing", { action: "myOptions" }).then((r) => r.data),
    retry: false,
  });
  const submit = useMutation({
    mutationFn: () => base44.functions.invoke("employeeBorrowing", { action: "myRequest", data: form }),
    onError: (e) => toast.error(policyError(e)),
    onSuccess: () => {
      toast.success("Advance request submitted for review");
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["myAdvanceOptions"] });
    },
  });

  if (isLoading || !data) return null;
  const selected = data.windows?.find((w) => w.date === form.borrow_date);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wallet className="w-5 h-5" /> Request a salary advance</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <AdvanceHistory salary={data.salary} typical={data.typical_amount} count={data.request_count} history={data.history} />
        {data.salary && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <Label>Disbursement date</Label>
              {data.policy.enabled ? (
                <Select value={selected ? form.borrow_date : ""} onValueChange={set("borrow_date")}>
                  <SelectTrigger><SelectValue placeholder="Select a date" /></SelectTrigger>
                  <SelectContent>
                    {data.windows.map((w) => (
                      <SelectItem key={w.date} value={w.date} disabled={!w.open}>{w.date}{w.open ? "" : " (closed)"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : <Input type="date" value={form.borrow_date} onChange={(e) => set("borrow_date")(e.target.value)} />}
              {selected && <p className="text-xs text-slate-500 mt-1">You can request up to EGP {selected.allowed.toFixed(2)} for this date.</p>}
            </div>
            <div><Label>Amount (EGP)</Label><Input type="number" value={form.amount} onChange={(e) => set("amount")(e.target.value)} /></div>
            <div><Label>Reason</Label><Input value={form.reason} onChange={(e) => set("reason")(e.target.value)} /></div>
            <div><Label>Repay over (months)</Label><Input type="number" min="1" value={form.installment_months} onChange={(e) => set("installment_months")(e.target.value)} /></div>
            <Button className="w-full" onClick={() => submit.mutate()} disabled={submit.isPending || !form.amount || !form.borrow_date}>
              {submit.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}