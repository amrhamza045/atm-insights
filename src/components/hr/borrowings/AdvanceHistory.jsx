import { Badge } from "@/components/ui/badge";

const COLORS = {
  pending: "bg-amber-100 text-amber-700", approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700", cancelled: "bg-slate-100 text-slate-600",
};
const money = (n) => `EGP ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Salary (prominent) + typical request + past requests. Shared by employee and reviewer views.
export default function AdvanceHistory({ salary, typical, count, history = [], limit = 5 }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3">
          <p className="text-xs text-slate-600">Base salary (monthly)</p>
          <p className="text-xl font-bold text-slate-900">{salary ? money(salary) : "Not on file"}</p>
        </div>
        <div className="rounded-lg border bg-slate-50 p-3">
          <p className="text-xs text-slate-600">Typical request</p>
          <p className="text-xl font-bold text-slate-900">{typical ? money(typical) : "—"}</p>
          <p className="text-xs text-slate-500">{count ? `across ${count} past request${count > 1 ? "s" : ""}` : "No past requests"}</p>
        </div>
      </div>
      {history.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-600">Past requests</p>
          {history.slice(0, limit).map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm border-b last:border-0 py-1">
              <span className="text-slate-500">{h.borrow_date}</span>
              <span className="font-medium">{money(h.amount)}</span>
              <Badge className={COLORS[h.status] || ""}>{h.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}