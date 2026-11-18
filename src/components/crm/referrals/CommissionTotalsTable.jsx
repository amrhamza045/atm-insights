import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/components/utils/currencyFormatter";

// rows: [{ key, events, total, paid }]; who: referrer key → a referral carrying the referrer's details.
export default function CommissionTotalsTable({ rows, who }) {
  const sum = rows.reduce((a, r) => ({ events: a.events + r.events, total: a.total + r.total, paid: a.paid + r.paid }), { events: 0, total: 0, paid: 0 });
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referrer</TableHead>
            <TableHead className="text-center">Events</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">To pay</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const ref = who[r.key];
            return (
              <TableRow key={r.key}>
                <TableCell>
                  <p className="font-medium text-slate-900">{ref?.referrer_name || "Referrer"}</p>
                  <p className="text-xs text-slate-500">{[ref?.referrer_phone, ref?.referrer_email].filter(Boolean).join(" · ") || "—"}</p>
                </TableCell>
                <TableCell className="text-center">{r.events}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.total, true)}</TableCell>
                <TableCell className="text-right text-green-700">{formatCurrency(r.paid, true)}</TableCell>
                <TableCell className="text-right font-semibold text-amber-700">{formatCurrency(r.total - r.paid, true)}</TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-slate-50 font-semibold">
            <TableCell>Total</TableCell>
            <TableCell className="text-center">{sum.events}</TableCell>
            <TableCell className="text-right">{formatCurrency(sum.total, true)}</TableCell>
            <TableCell className="text-right text-green-700">{formatCurrency(sum.paid, true)}</TableCell>
            <TableCell className="text-right text-amber-700">{formatCurrency(sum.total - sum.paid, true)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}