import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const OPTIONS = [
  { key: "push", label: "Push", icon: TrendingUp, active: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { key: "none", label: "Normal", icon: Minus, active: "bg-slate-700 text-white hover:bg-slate-800" },
  { key: "slow", label: "Slow Down", icon: TrendingDown, active: "bg-rose-600 text-white hover:bg-rose-700" }
];

export default function SteeringItemRow({ item, onSet, onNote }) {
  const current = item.sell_priority || "none";
  const [note, setNote] = useState(item.steering_note || "");

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 p-3 border border-slate-200 rounded-lg bg-white">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.name}</p>
        <p className="text-xs text-slate-500">{item.category || "Uncategorized"}</p>
      </div>
      <div className="flex gap-1.5">
        {OPTIONS.map(o => {
          const Icon = o.icon;
          const isActive = current === o.key;
          return (
            <Button
              key={o.key}
              size="sm"
              variant={isActive ? "default" : "outline"}
              className={`gap-1 ${isActive ? o.active : ""}`}
              onClick={() => onSet(item, o.key)}
            >
              <Icon className="w-3.5 h-3.5" />
              {o.label}
            </Button>
          );
        })}
      </div>
      <Input
        placeholder="Note for captains (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => { if (note !== (item.steering_note || "")) onNote(item, note); }}
        className="md:w-64"
      />
    </div>
  );
}