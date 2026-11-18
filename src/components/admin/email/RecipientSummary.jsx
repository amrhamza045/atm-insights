import { AlertTriangle, Users } from "lucide-react";

// One line: who this email reaches with the current (possibly unsaved) choice.
export default function RecipientSummary({ item, d, ctx }) {
  if (ctx.isLoading) return <span className="text-xs text-slate-400">Checking recipients…</span>;
  const chefMissing = item.reach === "chef" && !ctx.chef?.chef_selected;
  if (d.reachesNoOne || chefMissing) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
        <AlertTriangle className="h-3.5 w-3.5" />{chefMissing ? "No Head Chef set" : "No one will receive it"}
      </span>
    );
  }
  const usual = !d.includeUsual ? `${item.short} off`
    : item.reach === "chef" ? `Head Chef (${ctx.chef.chef_name})`
      : Array.isArray(d.usual) ? `${item.short} (${d.usual.length})` : item.short;
  const added = d.added ? (d.isClient ? `${d.added} cop${d.added === 1 ? "y" : "ies"}` : `${d.added} added`) : "";
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-600">
      <Users className="h-3.5 w-3.5 text-slate-400" />
      <span className={d.includeUsual ? "" : "text-slate-400 line-through"}>{usual}</span>
      {added && <span className="font-medium text-slate-800">+ {added}</span>}
      {d.blocked.length > 0 && <span className="text-amber-700">· {d.blocked.length} can't receive it</span>}
    </span>
  );
}