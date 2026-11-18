import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { HeartPulse } from "lucide-react";
import { HEALTH_META } from "@/components/crm/rfmEngine";

const BAR_COLOR = {
  Champion: "#10b981",
  Loyal: "#3b82f6",
  New: "#8b5cf6",
  Casual: "#94a3b8",
  "At Risk": "#f59e0b",
  Lost: "#ef4444",
  Unranked: "#cbd5e1",
};

export default function HealthDistributionChart({ distribution }) {
  const data = Object.keys(HEALTH_META)
    .sort((a, b) => HEALTH_META[a].order - HEALTH_META[b].order)
    .map((label) => ({ label, count: distribution[label] || 0 }))
    .filter((d) => d.count > 0);

  const atRisk = distribution["At Risk"] || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-slate-500" /> Health distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-slate-500">No clients to classify yet.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v} clients`, "Clients"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.map((d) => (
                    <Cell key={d.label} fill={BAR_COLOR[d.label] || "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {atRisk > 0 && (
              <p className="mt-2 text-sm font-medium text-amber-700">
                {atRisk} client{atRisk === 1 ? "" : "s"} at risk
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Classification thresholds are provisional and computed live — no scores are stored.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}