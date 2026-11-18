import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { DISPOSITION_LABEL } from "@/components/catering/returnedLabels";
import OpenEventButton from "./OpenEventButton";

/** One returned item in the all-events Returned list. */
export default function AllReturnedRow({ row: r }) {
  return (
    <TableRow>
      <TableCell>
        <p className="font-medium text-slate-900">{r.event_name}</p>
        <p className="text-xs text-slate-500">{r.event_date || "—"}</p>
      </TableCell>
      <TableCell>{r.item_name}</TableCell>
      <TableCell className="capitalize">{(r.category || "").replace(/_/g, " ")}</TableCell>
      <TableCell className="text-right">{r.quantity} {r.unit}</TableCell>
      <TableCell className="text-right">{formatCurrency(r.total_value || 0)}</TableCell>
      <TableCell className="capitalize">{r.condition}</TableCell>
      <TableCell>{DISPOSITION_LABEL[r.disposition] || r.disposition}</TableCell>
      <TableCell className="text-right"><OpenEventButton tab="returned" eventId={r.event_id} /></TableCell>
    </TableRow>
  );
}