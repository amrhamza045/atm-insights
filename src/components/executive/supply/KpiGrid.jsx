import KpiCard from "@/components/executive/kit/KpiCard";

// A report's headline figures. kpis: [metric, note] — a figure with a note
// (as of today, or compared another way) shows that note instead of a change.
export default function KpiGrid({ kpis, data, missing }) {
  const vs = data.comparison.label.toLowerCase();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpis.map(([m, note]) => (
        <KpiCard key={m} metric={m} value={data.current[m]} previous={note ? null : data.previous?.[m]} compareLabel={vs} missing={note || missing} currency={data.currency} />
      ))}
    </div>
  );
}