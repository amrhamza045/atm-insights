export const APPROVAL_BANDS = [
  { id: "money", label: "Money & Finance" },
  { id: "clients", label: "Clients & Loyalty" },
  { id: "stock", label: "Purchasing & Stock" },
  { id: "catering", label: "Catering" },
  { id: "people", label: "People & Operations" },
];

// Renders non-empty queues grouped into domain bands, each with a jump anchor.
export default function ApprovalBands({ sections }) {
  return APPROVAL_BANDS.map((band) => {
    const items = sections.filter((s) => s.band === band.id && s.count > 0);
    if (!items.length) return null;
    const total = items.reduce((n, s) => n + s.count, 0);
    return (
      <section key={band.id} className="space-y-5">
        <div className="flex items-center gap-3 pt-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{band.label}</h2>
          <span className="text-xs font-semibold rounded-full bg-slate-200 text-slate-700 px-2 py-0.5">{total}</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
        {items.map((s) => (
          <div key={s.id} id={`q-${s.id}`} className="scroll-mt-40">{s.render()}</div>
        ))}
      </section>
    );
  });
}