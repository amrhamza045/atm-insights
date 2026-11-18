import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Inbox, Filter } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { useBranch } from "@/components/branches/BranchContext";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const STATUS_META = {
  accepted: { label: "Approved by customer", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  rejected: { label: "Rejected by customer", cls: "bg-red-100 text-red-700", Icon: XCircle },
};

/**
 * Staff inbox for customer decisions made in the portal: who approved or rejected
 * what, for how much, and whether a staff member has actioned it yet.
 */
export default function ApprovalsTab({ onSelectEvent }) {
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [notes, setNotes] = useState({});
  const [saving, setSaving] = useState(null);

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["catering-approvals", selectedBranchId],
    queryFn: async () => {
      const [accepted, rejected] = await Promise.all([
        base44.entities.CateringQuote.filter({ branch_id: selectedBranchId, status: "accepted" }, "-customer_decision_date", 200),
        base44.entities.CateringQuote.filter({ branch_id: selectedBranchId, status: "rejected" }, "-customer_decision_date", 200),
      ]);
      return [...accepted, ...rejected]
        .filter((q) => q.customer_decision_date)
        .sort((a, b) => new Date(b.customer_decision_date) - new Date(a.customer_decision_date));
    },
    enabled: !!selectedBranchId,
  });

  const visible = quotes.filter((q) =>
    filter === "pending" ? !q.staff_acknowledged : filter === "done" ? q.staff_acknowledged : true
  );

  const pendingCount = quotes.filter((q) => !q.staff_acknowledged).length;

  const acknowledge = async (quote) => {
    setSaving(quote.id);
    try {
      const me = await base44.auth.me();
      await base44.entities.CateringQuote.update(quote.id, {
        staff_acknowledged: true,
        acknowledged_by: me?.email || "",
        acknowledged_date: new Date().toISOString(),
        staff_response_note: notes[quote.id] || "",
      });
      toast.success("Marked as handled");
      queryClient.invalidateQueries({ queryKey: ["catering-approvals"] });
    } catch (e) {
      toast.error("Could not update this approval");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 text-xs text-slate-600">
        Customer approval is optional — it is no longer required to move an event forward. Recording the deposit (with the
        client's transfer screenshot) is what advances the booking, and the reservation then waits for a Catering
        Manager/owner to approve. This list is just a record of decisions clients did make in the portal.
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        {[
          { key: "pending", label: `Needs action${pendingCount ? ` (${pendingCount})` : ""}` },
          { key: "done", label: "Handled" },
          { key: "all", label: "All" },
        ].map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-slate-500 text-sm">Loading approvals…</Card>
      ) : visible.length === 0 ? (
        <Card className="p-10 text-center text-slate-500">
          <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No customer decisions here yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((q) => {
            const meta = STATUS_META[q.status];
            return (
              <Card key={q.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{q.event_name}</p>
                    <p className="text-sm text-slate-500 truncate">
                      {q.client_name} · Quote {q.revision_number} · {moment(q.customer_decision_date).fromNow()}
                    </p>
                  </div>
                  <Badge className={meta.cls}>
                    <meta.Icon className="w-3.5 h-3.5 mr-1" />
                    {meta.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Approved total</p>
                    <p className="font-semibold">{formatCurrency(q.customer_decision_total || q.total, true)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Food & beverage</p>
                    <p>{formatCurrency(q.total, true)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Deposit required</p>
                    <p>{formatCurrency(q.required_deposit, true)}</p>
                  </div>
                </div>

                {q.staff_acknowledged ? (
                  <p className="text-xs text-slate-500">
                    Handled by {q.acknowledged_by || "staff"} {moment(q.acknowledged_date).fromNow()}
                    {q.staff_response_note ? ` — ${q.staff_response_note}` : ""}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      placeholder="Internal note (optional)"
                      className="max-w-xs"
                      value={notes[q.id] || ""}
                      onChange={(e) => setNotes({ ...notes, [q.id]: e.target.value })}
                    />
                    <Button size="sm" disabled={saving === q.id} onClick={() => acknowledge(q)}>
                      Mark as handled
                    </Button>
                    {onSelectEvent && (
                      <Button size="sm" variant="outline" onClick={() => onSelectEvent(q.event_id)}>
                        Open event
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}