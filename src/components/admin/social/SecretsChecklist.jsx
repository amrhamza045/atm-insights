import { CircleCheck, CircleX } from "lucide-react";

// `saved` maps each secret name to whether it has been added (undefined while loading).
export default function SecretsChecklist({ names, saved }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-700">Secrets (added in the dashboard's Secrets page)</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {names.map((name) => {
          const ok = saved?.[name];
          const Icon = ok ? CircleCheck : CircleX;
          const tone = !saved ? "text-slate-400" : ok ? "text-emerald-700" : "text-red-600";
          return (
            <li key={name} className={`flex items-center gap-1 text-xs font-mono ${tone}`}>
              {saved && <Icon className="w-3.5 h-3.5" />}
              {name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}