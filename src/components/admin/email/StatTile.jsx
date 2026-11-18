const TONES = { red: "text-red-600", green: "text-emerald-700", default: "text-slate-500" };

export default function StatTile({ label, value, sub, tone = "default" }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className={`mt-0.5 text-xs ${TONES[tone]}`}>{sub}</p>}
    </div>
  );
}