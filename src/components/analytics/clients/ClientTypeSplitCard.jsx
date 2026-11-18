import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Info } from "lucide-react";

/**
 * Corporate vs individual. client_type is set manually by staff and defaults to
 * "individual", so a near-100% individual reading means classification has not
 * been done yet — NOT that the base is genuinely all individuals. Said plainly.
 */
export default function ClientTypeSplitCard({ clients }) {
  const total = clients.length;
  const corporate = clients.filter((c) => c.client_type === "corporate").length;
  const individual = total - corporate;
  const corporatePct = total ? (corporate / total) * 100 : 0;
  const unclassified = corporatePct < 2;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" /> Corporate vs individual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-2xl font-bold text-slate-900">{individual.toLocaleString("en-US")}</p>
            <p className="text-xs text-slate-500">Individual</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{corporate.toLocaleString("en-US")}</p>
            <p className="text-xs text-slate-500">Corporate</p>
          </div>
        </div>

        <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
          <div className="bg-blue-500 h-full" style={{ width: `${100 - corporatePct}%` }} />
          <div className="bg-violet-500 h-full" style={{ width: `${corporatePct}%` }} />
        </div>

        <p className="mt-3 flex gap-1.5 text-xs text-slate-500">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {unclassified
              ? "Client type is set manually by staff and defaults to individual — this split reflects classification still in progress, not a settled distribution of the client base."
              : "Client type is set manually by staff, so records never reviewed still count as individual."}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}