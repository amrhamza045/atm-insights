import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import DiscountFormDialog from "./DiscountFormDialog";
import { applyQuoteDiscount, quoteGross } from "./discountLogic";

import { useCateringEditAccess } from "./useCateringEditAccess";
import FilterSelect from "./all/FilterSelect";
import { WHEN_OPTIONS } from "./all/allEventsQuery";
import useEventWhenScope from "./all/useEventWhenScope";

export default function EventDiscountsPanel({ actorEmail, eventId = null }) {
  const { canEditRecord } = useCateringEditAccess();
  const { selectedBranchId } = useBranch();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [when, setWhen] = useState("upcoming");

  // Scoped to an event: its own quotes. Branch-wide: the quotes of events in the chosen dates.
  const eventScope = useEventWhenScope(eventId ? "all" : when);
  const where = {
    branch_id: selectedBranchId,
    status: { $in: ["active", "accepted"] },
    ...(eventId ? { event_id: eventId } : eventScope.query),
  };
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["catering-quotes-active", selectedBranchId, where],
    queryFn: () => base44.entities.CateringQuote.filter(where, "-created_date", 300),
    enabled: !!selectedBranchId && eventScope.ready,
  });

  const handleSave = async ({ discount, reason }) => {
    setSaving(true);
    try {
      await applyQuoteDiscount({ quote: editing, discount, reason, actorEmail });
      toast.success("Discount applied");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["catering-quotes-active"] });
      queryClient.invalidateQueries({ queryKey: ["catering-events"] });
    } catch (e) {
      toast.error(e.message || "Could not apply the discount");
    } finally {
      setSaving(false);
    }
  };

  const whenBar = !eventId && (
    <div className="mb-3 flex justify-end">
      <FilterSelect value={when} onChange={setWhen} options={WHEN_OPTIONS} />
    </div>
  );

  if (isLoading || !eventScope.ready) return <>{whenBar}<p className="text-sm text-slate-500">Loading quotes…</p></>;
  if (quotes.length === 0)
    return (
      <>
        {whenBar}
        <p className="text-sm text-slate-500">
          {eventId
            ? "No active or accepted quote for this event."
            : when === "all"
              ? "No active or accepted quotes in this branch."
              : `No active or accepted quotes for ${when} events.`}
        </p>
      </>
    );

  return (
    <>
      {whenBar}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Discount</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Margin</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((q) => {
            const discount = Number(q.discount_amount) || 0;
            return (
              <TableRow key={q.id}>
                <TableCell className="font-medium">
                  {q.event_name}
                  <span className="block text-xs text-slate-400">Rev {q.revision_number}</span>
                </TableCell>
                <TableCell>{q.client_name}</TableCell>
                <TableCell className="text-right">{formatCurrency(quoteGross(q))}</TableCell>
                <TableCell className="text-right">
                  {discount > 0 ? (
                    <Badge className="bg-amber-100 text-amber-700">{formatCurrency(discount)}</Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(q.total)}</TableCell>
                <TableCell className="text-right">{formatCurrency(q.estimated_margin)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setEditing(q)} disabled={!canEditRecord(q)}>
                    {discount > 0 ? "Edit" : "Add"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <DiscountFormDialog
        quote={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSave={handleSave}
        saving={saving}
      />
    </>
  );
}