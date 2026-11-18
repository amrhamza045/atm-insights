import React from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, MessageCircle, Bell, Send } from "lucide-react";
import { format } from "date-fns";
import { getInteractionMeta } from "./interactionMeta";

const KIND_STYLE = {
  notification: { icon: Bell, tint: "bg-blue-50 text-blue-600" },
  whatsapp_in: { icon: MessageCircle, tint: "bg-emerald-50 text-emerald-600" },
  invite_send: { icon: Send, tint: "bg-violet-50 text-violet-600" },
};

export default function TimelineEventRow({ event }) {
  const isInteraction = event.kind === "interaction";
  const meta = isInteraction ? getInteractionMeta(event.raw.interaction_type) : null;
  const style = KIND_STYLE[event.kind] || {};
  const Icon = isInteraction ? meta.icon : style.icon || Bell;
  const tint = isInteraction ? "bg-slate-100 text-slate-600" : style.tint;
  const label = isInteraction ? meta.label : event.label;
  const sourceLabel = isInteraction
    ? event.actor
      ? `logged by ${event.actor}`
      : "logged"
    : event.sourceLabel;

  return (
    <div className="flex gap-3 py-2.5">
      <div className={`mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center ${tint}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">{label}</Badge>
          {sourceLabel && <span className="text-xs text-slate-500">— {sourceLabel}</span>}
          <span className="text-xs text-slate-500">
            {format(new Date(event.at), "dd MMM yyyy HH:mm")}
          </span>
        </div>

        {event.title && (
          <p className="text-sm font-medium text-slate-900 mt-1 break-words">{event.title}</p>
        )}
        {event.body ? (
          <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap break-words">{event.body}</p>
        ) : event.kind === "invite_send" ? (
          <p className="text-xs text-slate-500 mt-1 italic">
            Send recorded — message content is not stored by the sending system.
          </p>
        ) : null}

        {isInteraction && event.raw.follow_up_date && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${event.raw.follow_up_completed ? "text-slate-500" : "text-warning-700"}`}>
            <CalendarClock className="w-3 h-3" />
            Follow up {format(new Date(event.raw.follow_up_date), "dd MMM yyyy")}
            {event.raw.follow_up_completed && " — done"}
          </p>
        )}
      </div>
    </div>
  );
}