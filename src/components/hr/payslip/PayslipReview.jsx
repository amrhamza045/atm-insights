import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, Eye } from "lucide-react";
import { toast } from "sonner";
import { monthLabelOf } from "./generatePayslip";

/** Review & dispatch panel for the payslips generated when payroll was run. */
export default function PayslipReview({ month, branchId }) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const key = ["payslips", month, branchId];

  const { data: payslips = [] } = useQuery({
    queryKey: key,
    queryFn: () => base44.entities.Payslip.filter({ month: `${month}-01`, ...(branchId ? { branch_id: branchId } : {}) }),
  });

  const open = async (p) => {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: p.pdf_file_uri, expires_in: 300 });
    window.open(signed_url, "_blank");
  };

  const dispatchOne = async (p, me) => {
    if (!p.employee_email) throw new Error(`${p.employee_name} has no email address`);
    const label = monthLabelOf(month);
    await base44.integrations.Core.SendEmail({
      to: p.employee_email,
      subject: `Your payslip for ${label}`,
      body: `Dear ${p.employee_name},\n\nYour detailed payslip for ${label} is attached.\nNet pay: EGP ${(p.net_salary || 0).toFixed(2)}\n\nIf you have any questions, please contact HR.`,
      attachments: [{ filename: `payslip-${month}.pdf`, file_url: p.pdf_file_uri }],
    });
    await base44.entities.Payslip.update(p.id, { status: "dispatched", dispatched_at: new Date().toISOString(), dispatched_by: me?.email || "" });
  };

  const dispatch = useMutation({
    mutationFn: async (list) => {
      setBusyId(list.length === 1 ? list[0].id : "all");
      const me = await base44.auth.me();
      let sent = 0; const errors = [];
      for (const p of list) {
        try { await dispatchOne(p, me); sent++; } catch (e) { errors.push(e.message); }
      }
      return { sent, errors };
    },
    onSuccess: ({ sent, errors }) => {
      if (sent) toast.success(`${sent} payslip${sent > 1 ? "s" : ""} sent`);
      if (errors.length) toast.error(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} more)` : ""));
      qc.invalidateQueries({ queryKey: ["payslips"] });
    },
    onSettled: () => setBusyId(null),
  });

  if (payslips.length === 0) return null;
  const pending = payslips.filter((p) => p.status === "pending_review");

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <p className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Payslips for review</p>
            <p className="text-xs text-slate-500">{pending.length} pending review · {payslips.length - pending.length} sent. Nothing is emailed until you send it.</p>
          </div>
          {pending.length > 0 && (
            <Button size="sm" className="gap-1" disabled={dispatch.isPending} onClick={() => dispatch.mutate(pending)}>
              <Send className="w-3 h-3" />{busyId === "all" ? "Sending..." : `Send all pending (${pending.length})`}
            </Button>
          )}
        </div>
        <div className="divide-y">
          {payslips.map((p) => (
            <div key={p.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium flex-1 min-w-[140px]">{p.employee_name}</span>
              <span className="text-slate-600">Net EGP {(p.net_salary || 0).toFixed(2)}</span>
              <Badge className={p.status === "dispatched" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                {p.status === "dispatched" ? "Sent" : "Pending review"}
              </Badge>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => open(p)}><Eye className="w-3 h-3" /> View PDF</Button>
              {p.status === "pending_review" && (
                <Button size="sm" className="gap-1" disabled={dispatch.isPending} onClick={() => dispatch.mutate([p])}>
                  <Send className="w-3 h-3" />{busyId === p.id ? "Sending..." : "Send"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}