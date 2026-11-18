import React from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import usePortalServiceCosts from "./usePortalServiceCosts";

/** Single merged servicing cost line for the customer's own event — no breakdown. */
export default function PortalServiceCostsCard({ event }) {
  const { data, isLoading } = usePortalServiceCosts(event.id);

  if (isLoading) return <Card className="p-4 text-sm text-slate-500">Loading servicing cost…</Card>;
  if (!data || data.error) return null;

  const { grand_total = 0 } = data;
  if (!grand_total) return null;

  return (
    <Card className="p-4">
      <div className="flex justify-between text-sm font-semibold">
        <span>Servicing cost</span>
        <span>{formatCurrency(grand_total, true)}</span>
      </div>
    </Card>
  );
}