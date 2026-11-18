import { useState } from "react";
import ReportCard from "@/components/executive/kit/ReportCard";
import { fmtValue } from "@/components/executive/kit/formatters";

const INFO = {
  calculation: "The whole equipment catalog as of today, whatever the period: active items, pieces owned (bulk quantities, or units for individually tracked items), their purchase value, straight-line depreciation a year ((purchase cost − salvage) ÷ useful life for each piece), the book value left after depreciation since purchase, and repairs still open.",
  source: "Assets & Resources › equipment catalog, units and maintenance records.",
};

// A snapshot of what the equipment is worth today.
export default function AssetRegisterCard({ register: r, currency }) {
  const [all, setAll] = useState(false);
  const stats = [["Catalog items", r.items, "number"], ["Pieces owned", r.pieces, "number"], ["Purchase value", r.asset_value, "money"], ["Book value", r.book_value, "money"], ["Depreciation a year", r.annual_depreciation, "money"], ["Open repairs", r.open_repairs, "number"]];
  return (
    <ReportCard title="Asset register" subtitle={`As of today · open repairs cost ${fmtValue(r.open_repair_cost, "money", currency)}`} info={INFO}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(([label, value, format]) => (
          <div key={label} className="rounded-xl bg-cream px-3 py-2">
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className="font-semibold tabular-nums text-navy">{fmtValue(value, format, currency)}</dd>
          </div>
        ))}
      </dl>
      {r.depreciation.length === 0 ? <p className="mt-4 text-xs text-slate-500">No equipment has a purchase cost yet, so there's nothing to depreciate. Add purchase costs to the equipment in Assets & Resources.</p> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-slate-500"><th className="py-2 text-left font-medium">Item</th><th className="py-2 pl-3 text-right font-medium">Pieces</th><th className="py-2 pl-3 text-right font-medium">Value</th><th className="py-2 pl-3 text-right font-medium">A year</th><th className="py-2 pl-3 text-right font-medium">Book value</th></tr></thead>
            <tbody>
              {(all ? r.depreciation : r.depreciation.slice(0, 10)).map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="max-w-[14rem] py-2"><span className="block truncate text-slate-700" dir="auto">{row.name}</span><span className="block truncate text-[11px] text-slate-400" dir="auto">{row.category}</span></td>
                  <td className="py-2 pl-3 text-right tabular-nums text-navy">{fmtValue(row.pieces, "number")}</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-navy">{fmtValue(row.asset_value, "money", currency)}</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-navy">{fmtValue(row.annual, "money", currency)}</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-navy">{fmtValue(row.book_value, "money", currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {r.depreciation.length > 10 && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-medium text-gold hover:underline">{all ? "Show the top 10" : `Show all ${r.depreciation.length}`}</button>}
    </ReportCard>
  );
}