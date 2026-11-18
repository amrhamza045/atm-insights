import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

/** Read-only confirmation view of the approved quote — never editable here. */
export default function ConfirmQuoteSummary({ quote }) {
  const lines = quote?.line_items || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Approved quote — revision {quote?.revision_number || 1}
          {quote?.package_name ? ` · ${quote.package_name}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-slate-200 divide-y">
          {lines.length === 0 && <p className="text-sm text-slate-500 p-3">This quote has no line items.</p>}
          {lines.map((l, i) => (
            <div key={i} className="flex items-start justify-between gap-3 p-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{l.name}</p>
                <p className="text-xs text-slate-500">
                  {l.quantity} × {formatCurrency(l.unit_price)}
                </p>
              </div>
              <p className="text-sm font-medium text-slate-900 shrink-0">{formatCurrency(l.line_total)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-sm">
          <Row label="Subtotal" value={quote?.subtotal} />
          {Number(quote?.tax_total) > 0 && <Row label="Tax" value={quote.tax_total} />}
          {Number(quote?.service_charge_total) > 0 && <Row label="Service charge" value={quote.service_charge_total} />}
          {Number(quote?.discount_amount) > 0 && <Row label="Discount" value={-quote.discount_amount} />}
          <div className="flex justify-between font-bold pt-1 border-t">
            <span>Quote total</span>
            <span>{formatCurrency(quote?.total)}</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 flex gap-1.5 rounded-lg bg-slate-50 border border-slate-200 p-2.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          These items are locked for confirmation. To change anything, go to the Quotes tab and create a new revision —
          it supersedes this one automatically.
        </p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}