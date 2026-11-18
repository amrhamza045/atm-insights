import { SUPPORT_TOPICS } from "./supportTopics";

export default function TopicStep({ value, onPick }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SUPPORT_TOPICS.map(({ key, label, hint, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(key)}
          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-amber-400 hover:shadow-sm ${value === key ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white"}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><Icon className="h-4 w-4" /></span>
          <span>
            <span className="block font-medium text-slate-900">{label}</span>
            <span className="block text-sm text-slate-500">{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}