import LossEventRow from "./LossEventRow";

const BELOW = ["loss", "underperforming"];
const SECTIONS = [
  ["Below target", (e) => BELOW.includes(e.status), (a, b) => b.shortfall - a.shortfall],
  ["Can't be analysed", (e) => e.status === "insufficient_data", () => 0],
  ["On target", (e) => e.status === "on_target", () => 0],
];

// The period's delivered events in three groups; picking one opens its walkthrough.
export default function LossEventPicker({ events, selectedId, onSelect, currency }) {
  if (!events.length) return <p className="py-6 text-center text-sm text-slate-500">No events were delivered in this period.</p>;
  return (
    <div className="max-h-[40rem] space-y-5 overflow-y-auto pr-1">
      {SECTIONS.map(([title, keep, order]) => {
        const list = events.filter(keep).sort(order);
        return list.length > 0 && (
          <section key={title} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title} · {list.length}</h4>
            {list.map((e) => <LossEventRow key={e.id} event={e} selected={e.id === selectedId} onSelect={onSelect} currency={currency} />)}
          </section>
        );
      })}
    </div>
  );
}