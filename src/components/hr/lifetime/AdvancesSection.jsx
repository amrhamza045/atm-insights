import { useEmployeeHistory } from "@/components/hr/profile/useEmployeeHistory";
import { Badge } from "@/components/ui/badge";

export default function AdvancesSection({ employee }) {
  const { borrowings } = useEmployeeHistory(employee.id);
  const rows = borrowings.data || [];
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <h3 className="font-semibold">Salary advances</h3>
      {borrowings.isLoading ? <p className="text-sm text-slate-500">Loading…</p>
        : rows.length === 0 ? <p className="text-sm text-slate-500">No advances recorded.</p>
        : rows.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border rounded-md p-2">
            <span>{(b.borrow_date || "").slice(0, 10)} · {b.amount} · {b.reason || "No reason"}</span>
            <span className="flex gap-2 items-center text-xs text-slate-500">
              Remaining {b.remaining_balance ?? b.amount}
              <Badge variant="secondary">{b.request_status || b.status}</Badge>
            </span>
          </div>
        ))}
    </div>
  );
}