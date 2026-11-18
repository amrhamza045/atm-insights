import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 border-b">
          <tr>{columns.map((c) => <th key={c.label} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              {columns.map((c) => <td key={c.label} className="px-3 py-2 text-slate-700 whitespace-nowrap">{c.render(r) ?? "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One block of records whose date falls within [from, to] (YYYY-MM-DD, inclusive). */
export default function HistorySection({ title, query, dateKey, columns, from, to, rangeLabel }) {
  const rows = (query.data || []).filter((r) => {
    const d = (r[dateKey] || "").slice(0, 10);
    return d && (!from || d >= from) && (!to || d <= to);
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {title}
          <Badge variant="secondary">{rows.length} {rangeLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">No records {rangeLabel}.</p>
        ) : (
          <Table columns={columns} rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}