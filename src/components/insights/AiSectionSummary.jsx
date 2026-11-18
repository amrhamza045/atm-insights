import React from "react";
import { Card } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";

/** Level 2 — AI executive summary for one Business Insights section.
 *  Generates itself automatically, and only regenerates when the underlying
 *  numbers actually change (the facts payload is part of the cache key). */
export default function AiSectionSummary({ title, facts }) {
  const factsKey = JSON.stringify(facts ?? null);

  const { data: summary, isFetching } = useQuery({
    queryKey: ["aiSectionSummary", title, factsKey],
    queryFn: async () => {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a restaurant & catering business consultant reviewing the "${title}" section of an executive insights module.
Here is the data (currency EGP):
${factsKey}

Write a 3-4 sentence executive summary: what happened, why it likely happened, and the single most useful next step. Be concrete, use the numbers, no bullet points, no preamble.`,
      });
      return typeof res === "string" ? res : JSON.stringify(res);
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <Card className="p-4 bg-slate-50 border-slate-200">
      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-600" /> AI executive summary
      </p>
      {summary ? (
        <p className="text-sm text-slate-700 mt-2 leading-relaxed">{summary}</p>
      ) : (
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
          {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Reading this section's numbers…
        </p>
      )}
    </Card>
  );
}