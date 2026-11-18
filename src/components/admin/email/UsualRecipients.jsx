import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import HeadChefPicker from "./HeadChefPicker";
import PeopleList from "./PeopleList";

// The email's usual recipients: always on for client emails, switchable for staff emails.
export default function UsualRecipients({ item, d, ctx, headChefId, onToggle }) {
  if (d.isClient) {
    return <p className="text-sm text-slate-700"><span className="font-medium">Always sent to:</span> {item.to}</p>;
  }
  const id = `usual-${item.key}`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
        <Switch id={id} checked={d.includeUsual} onCheckedChange={onToggle} />
        <span className="text-sm text-slate-800">{item.usual}</span>
      </label>
      {item.reach === "chef" && (
        <HeadChefPicker
          chef={ctx.chef}
          employees={ctx.employees.filter((e) => e.active)}
          selectedId={headChefId}
          onSelect={ctx.setHeadChef}
          loading={ctx.isLoading}
        />
      )}
      {d.includeUsual && item.reach !== "chef" && (
        d.usual === undefined
          ? <p className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking…</p>
          : Array.isArray(d.usual) ? <PeopleList people={d.usual} emptyText={item.empty} />
            : item.perEmail && <p className="text-xs text-slate-500">{item.perEmail}</p>
      )}
      {item.note && <p className="text-xs text-slate-500">{item.note}</p>}
    </div>
  );
}