import { Clock, Send } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function EmailRowDetails({ item, checked, changed }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={`email-${item.key}`} className={`font-medium ${checked ? "text-slate-900" : "text-slate-500"}`}>{item.label}</Label>
        {!checked && <Badge variant="outline" className="text-slate-500">Off</Badge>}
        {changed && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Unsaved</Badge>}
      </div>
      <p className="text-xs text-slate-500">{item.description}</p>
      <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        <div className="flex gap-1.5">
          <dt className="flex shrink-0 items-center gap-1 text-slate-400"><Clock className="w-3.5 h-3.5" />When</dt>
          <dd className="text-slate-700">{item.when}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="flex shrink-0 items-center gap-1 text-slate-400"><Send className="w-3.5 h-3.5" />To</dt>
          <dd className="text-slate-700">{item.to}</dd>
        </div>
      </dl>
    </>
  );
}