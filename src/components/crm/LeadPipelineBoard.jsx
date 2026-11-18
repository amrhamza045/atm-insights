import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { PIPELINE_STAGES, stageOf } from "./leadPipeline";
import LeadPipelineCard from "./LeadPipelineCard";
import ConvertLeadDialog from "./ConvertLeadDialog";
import LeadDateRangeFilter from "./LeadDateRangeFilter";

export default function LeadPipelineBoard({ canManage, currentUser }) {
  const queryClient = useQueryClient();
  const [convertingLead, setConvertingLead] = useState(null);
  const [range, setRange] = useState({ from: "", to: "" });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: () => base44.entities.Lead.list("-created_date", 500),
  });

  // Filter on created_date (inclusive of both end dates)
  const visibleLeads = useMemo(() => {
    if (!range.from && !range.to) return leads;
    return leads.filter((l) => {
      if (!l.created_date) return false;
      const day = String(l.created_date).slice(0, 10);
      if (range.from && day < range.from) return false;
      if (range.to && day > range.to) return false;
      return true;
    });
  }, [leads, range]);

  const handleStatusChange = async (lead, status) => {
    await base44.entities.Lead.update(lead.id, { status });
    await queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
    toast.success("Lead stage updated");
  };

  if (isLoading) return <p className="text-sm text-slate-500">Loading leads…</p>;

  return (
    <>
      <LeadDateRangeFilter
        from={range.from}
        to={range.to}
        onChange={setRange}
        matched={visibleLeads.length}
        total={leads.length}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {PIPELINE_STAGES.map((stage) => {
          const items = visibleLeads.filter((l) => stageOf(l) === stage.value);
          return (
            <div key={stage.value} className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${stage.accent}`}>{stage.label}</span>
                <span className="text-xs text-slate-500">{items.length}</span>
              </div>
              <div className="space-y-2 max-h-[65vh] overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 px-1 py-2">No leads</p>
                ) : (
                  items.map((lead) => (
                    <LeadPipelineCard
                      key={lead.id}
                      lead={lead}
                      canManage={canManage}
                      onStatusChange={handleStatusChange}
                      onConvert={setConvertingLead}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {convertingLead && (
        <ConvertLeadDialog
          lead={convertingLead}
          open={!!convertingLead}
          onOpenChange={(v) => !v && setConvertingLead(null)}
          currentUser={currentUser}
        />
      )}
    </>
  );
}