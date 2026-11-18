import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightCircle, CheckCircle2, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { PLATFORM_META, PRIORITY_META, platformOf } from "@/components/marketing/socialLeadMeta";
import { PIPELINE_STAGES, stageOf, leadName } from "./leadPipeline";

export default function LeadPipelineCard({ lead, canManage, onStatusChange, onConvert }) {
  const platform = PLATFORM_META[platformOf(lead)] || { label: platformOf(lead), badge: "bg-slate-100 text-slate-700" };
  const stage = stageOf(lead);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 truncate">{leadName(lead)}</p>
        {lead.priority_label && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_META[lead.priority_label] || ""}`}>
            {lead.priority_label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-xs px-1.5 py-0.5 rounded ${platform.badge}`}>{platform.label}</span>
        {lead.lead_number && <Badge variant="outline" className="text-xs">{lead.lead_number}</Badge>}
      </div>

      <p className="text-xs text-slate-500 truncate">{lead.email || lead.phone || lead.phone_number || "No contact details"}</p>

      {lead.created_date && (
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <CalendarDays className="w-3 h-3" />
          {format(new Date(lead.created_date), "d MMM yyyy")}
        </p>
      )}

      {lead.converted_client_id && (
        <p className="text-xs text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {lead.conversion_mode === "linked_existing" ? "Linked to" : "Created"} {lead.converted_client_name}
        </p>
      )}

      {canManage && stage !== "converted" && (
        <div className="space-y-1.5 pt-1">
          <Select value={stage} onValueChange={(v) => onStatusChange(lead, v)}>
            <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.filter((s) => s.value !== "converted").map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8 gap-1 w-full" onClick={() => onConvert(lead)}>
            <ArrowRightCircle className="w-3.5 h-3.5" /> Convert
          </Button>
        </div>
      )}
    </div>
  );
}