import { formatCurrency } from "@/components/utils/currencyFormatter";

const money = (v) => formatCurrency(v, false);
const signed = (v) => `${v > 0 ? "+" : ""}${money(v)}`;
const tone = (v) => (v === 0 ? "text-slate-400" : v < 0 ? "text-red-600" : "text-emerald-600");

export default function VarianceTable({ rows }) {
  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const total = { key: "total", label: "Event total", expected: sum("expected"), actual: sum("actual"), variance: sum("variance") };
  const row = (r, isTotal) => (
    <tr key={r.key} className={isTotal ? "bg-slate-50 font-semibold" : "border-b last:border-0"}>
      <td className="p-3">{isTotal ? r.label : <><p className="font-medium text-slate-800">{r.label}</p><p className="text-xs text-slate-400">{r.source}</p></>}</td>
      <td className="p-3 text-right">{money(r.expected)}</td>
      <td className="p-3 text-right">{money(r.actual)}</td>
      <td className={`p-3 text-right font-semibold ${tone(r.variance)}`}>{signed(r.variance)}</td>
    </tr>
  );
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-slate-500">
            <th className="p-3">Category</th><th className="p-3 text-right">Expected</th><th className="p-3 text-right">Actual</th><th className="p-3 text-right">Variance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => row(r, false))}
          {row(total, true)}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-slate-400">Positive = under expected cost; negative = overspend.</p>
    </div>
  );
}