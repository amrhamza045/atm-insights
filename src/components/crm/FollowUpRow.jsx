import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { getInteractionMeta } from "./interactionMeta";
import { bucketMeta } from "./followUps";

export default function FollowUpRow({ item, bucket, onComplete, completing }) {
  const meta = getInteractionMeta(item.interaction_type);
  const Icon = meta.icon;
  const bm = bucketMeta(bucket);

  return (
    <div className={`rounded-lg border p-3 flex items-start gap-3 ${bm.card}`}>
      <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-white/70 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-slate-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-900 truncate">{item.client_name || "Client"}</span>
          <Badge variant="secondary" className="text-xs">{meta.label}</Badge>
          <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${bm.badge}`}>
            <CalendarClock className="w-3 h-3" />
            {format(new Date(item.follow_up_date), "dd MMM yyyy")}
          </span>
        </div>
        <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{item.note}</p>
      </div>
      <Button size="sm" variant="outline" className="gap-1 shrink-0" disabled={completing} onClick={() => onComplete(item)}>
        <Check className="w-3.5 h-3.5" /> Done
      </Button>
    </div>
  );
}