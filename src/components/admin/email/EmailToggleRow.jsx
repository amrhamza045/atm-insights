import { ChevronDown, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { describeRecipients } from "./recipientChoice";
import EmailRowDetails from "./EmailRowDetails";
import RecipientSummary from "./RecipientSummary";
import LastSent from "./LastSent";
import RecipientsEditor from "./RecipientsEditor";

export default function EmailToggleRow({
  item, checked, changed, onChange, choice, onChoiceChange, recipientsUnsaved,
  ctx, headChefId, stats, open, onOpenChange, onShowActivity,
}) {
  const d = describeRecipients(item, choice, ctx);
  return (
    <div id={`email-row-${item.key}`} className={`scroll-mt-24 overflow-hidden rounded-lg border transition-colors ${checked ? "bg-white" : "bg-slate-50"}`}>
      <div className="flex items-start gap-4 p-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <EmailRowDetails item={item} checked={checked} changed={changed} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5">
            <RecipientSummary item={item} d={d} ctx={ctx} />
            <LastSent stats={stats} onShow={onShowActivity} />
          </div>
        </div>
        <Switch id={`email-${item.key}`} checked={checked} onCheckedChange={onChange} />
      </div>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between border-t px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        <span className="flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />{open ? "Hide recipients" : "Choose recipients & send a test"}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <RecipientsEditor item={item} choice={choice} d={d} ctx={ctx} onChange={onChoiceChange} unsaved={recipientsUnsaved} headChefId={headChefId} />
      )}
    </div>
  );
}