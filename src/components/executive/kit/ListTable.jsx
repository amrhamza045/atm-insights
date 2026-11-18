import { useState } from "react";
import { fmtValue } from "./formatters";

// Records as a table. columns: [{ key, label, format, render }] — format
// (money | number | percent | rating) formats row[key]; render(row) draws the
// cell itself; neither shows row[key] as text. The first column is the name.
// Only the first `limit` rows show until all are asked for.
export default function ListTable({ rows, columns, currency, empty, limit = 10, rowKey = (r) => r.id }) {
  const [all, setAll] = useState(false);
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>;
  const cell = (c, r) => (c.render ? c.render(r) : c.format ? fmtValue(r[c.key], c.format, currency) : r[c.key] || "—");
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-slate-500">
              {columns.map((c, i) => <th key={c.key} scope="col" className={`py-2 font-medium ${i ? "pl-3 text-right" : "text-left"}`}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {(all ? rows : rows.slice(0, limit)).map((r) => (
              <tr key={rowKey(r)} className="border-b border-slate-100 last:border-0">
                {columns.map((c, i) => (
                  <td key={c.key} className={i ? "whitespace-nowrap py-2 pl-3 text-right tabular-nums text-navy" : "max-w-[16rem] py-2 text-slate-700"}>
                    {i || c.render ? cell(c, r) : <span className="block truncate" dir="auto">{cell(c, r)}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <button type="button" onClick={() => setAll(!all)} className="mt-3 text-xs font-medium text-gold hover:underline">
          {all ? `Show the top ${limit}` : `Show all ${rows.length}`}
        </button>
      )}
    </>
  );
}