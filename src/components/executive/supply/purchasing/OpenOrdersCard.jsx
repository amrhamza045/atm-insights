import { Badge } from "@/components/ui/badge";
import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { fmtMoney } from "@/components/executive/kit/formatters";
import { OPEN_INFO } from "./purchasingConfig";

// The purchase orders still open today, by stage.
export default function OpenOrdersCard({ open, currency }) {
  const stage = Object.fromEntries(open.stages.map((s) => [s.key, s.label]));
  const columns = [
    { key: "supplier", label: "Order", render: (r) => <><span className="block truncate" dir="auto">{r.supplier}</span><span className="block truncate text-[11px] text-slate-400" dir="auto">{r.number}</span></> },
    { key: "status", label: "Stage", render: (r) => <span className="text-slate-600">{stage[r.status]}</span> },
    { key: "due", label: "Due", render: (r) => <span className={r.overdue ? "text-danger-700" : ""}>{r.due || "—"}{r.overdue ? " · overdue" : ""}</span> },
    { key: "tags", label: "", render: (r) => <span className="inline-flex gap-1">{r.urgent && <Badge variant="outline" className="text-[10px] text-danger-700">Urgent</Badge>}{r.catering && <Badge variant="outline" className="text-[10px] text-slate-500">Catering</Badge>}</span> },
    { key: "value", label: "Value", format: "money" },
  ];
  return (
    <ReportCard title="Open orders" subtitle={`As of today · ${open.count} open, ${open.overdue} overdue · ${fmtMoney(open.value, currency)}`} info={OPEN_INFO}>
      <div className="mb-3 flex flex-wrap gap-2">
        {open.stages.filter((s) => s.count > 0).map((s) => (
          <span key={s.key} className="rounded-full bg-cream px-2.5 py-1 text-[11px] text-navy">{s.label}: {s.count} · {fmtMoney(s.value, currency)}</span>
        ))}
      </div>
      <ListTable rows={open.rows} columns={columns} currency={currency} empty="No purchase orders are open." />
    </ReportCard>
  );
}