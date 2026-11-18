import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { TrendingUp } from "lucide-react";

/** Registrations per month from Client.created_date — real historical data. */
function buildMonthlyRegistrations(clients, months = 12) {
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = startOfMonth(subMonths(new Date(), months - 1 - i));
    return { key: format(d, "yyyy-MM"), month: format(d, "MMM yy"), count: 0 };
  });
  const index = new Map(buckets.map((b) => [b.key, b]));
  for (const c of clients) {
    if (!c.created_date) continue;
    const bucket = index.get(format(new Date(c.created_date), "yyyy-MM"));
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

export default function RegistrationTrendChart({ clients }) {
  const data = buildMonthlyRegistrations(clients);
  const hasAny = data.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-500" /> New registrations — last 12 months
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <p className="text-sm text-slate-500">No registrations recorded in the last 12 months.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v} clients`, "Registered"]} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}