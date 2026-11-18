const STEPS = ["Loss overview", "Factor breakdown", "Root cause ranking", "Narrative and actions", "Post-event variance"];

export default function LossTripNav({ step, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      {STEPS.map((label, index) => <button key={label} onClick={() => onChange(index)} className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold ${step === index ? "border-amber-400 bg-amber-100 text-amber-800" : "border-slate-200 bg-white text-slate-500"}`}><span className="block text-[10px] uppercase tracking-wide">Step {index + 1}</span>{label}</button>)}
    </div>
  );
}