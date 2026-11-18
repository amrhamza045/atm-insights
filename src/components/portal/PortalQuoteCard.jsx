import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { buildPortalQuoteView } from "./portalQuoteView";

/** Customer-facing quote card — shaped entirely by the Client-side quote settings. */
export default function PortalQuoteCard({ quote, vis, serviceTotal = 0, guests = 0 }) {
  const view = buildPortalQuoteView(quote, vis, { serviceTotal, guests });

  return (
    <Card className="p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">Your quote{quote?.variant_label ? ` — ${quote.variant_label}` : ""}</p>
        {quote?.package_name && <Badge variant="outline" className="text-xs">{quote.package_name}</Badge>}
      </div>

      {!view ? (
        <p className="text-sm text-slate-500">No quote has been shared with you yet.</p>
      ) : view.startingFrom ? (
        <div className="pt-1">
          <p className="text-xs text-slate-500">Starting from</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(view.showPerGuest ? view.perGuest : view.total, true)}
            {view.showPerGuest && <span className="text-sm font-normal text-slate-500"> / guest</span>}
          </p>
        </div>
      ) : (
        <>
          {view.showLines && (
            <div className="rounded-lg border divide-y">
              {view.lines.map((l, i) => (
                <div key={i} className="flex justify-between px-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate">{l.name}{view.showQuantities ? ` × ${l.quantity}` : ""}</span>
                  {view.showLinePrices && <span>{formatCurrency(l.amount, true)}</span>}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1 text-sm pt-1">
            {view.showBreakdown && (
              <>
                <div className="flex justify-between"><span className="text-slate-600">{view.labels.subtotal}</span><span>{formatCurrency(view.subtotal, true)}</span></div>
                {!!view.service && <div className="flex justify-between"><span className="text-slate-600">{view.labels.service}</span><span>{formatCurrency(view.service, true)}</span></div>}
                {!!view.tax && <div className="flex justify-between"><span className="text-slate-600">{view.labels.tax}</span><span>{formatCurrency(view.tax, true)}</span></div>}
                {view.showDiscount && <div className="flex justify-between"><span className="text-slate-600">{view.labels.discount}</span><span>-{formatCurrency(view.discount, true)}</span></div>}
              </>
            )}
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>{view.labels.total}</span><span>{formatCurrency(view.total, true)}</span>
            </div>
            {view.showPerGuest && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Per guest</span><span>{formatCurrency(view.perGuest, true)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {quote?.notes && !vis.portal_hide_internal_notes && (
        <p className="text-xs text-slate-500 border-t pt-2 whitespace-pre-wrap">{quote.notes}</p>
      )}
    </Card>
  );
}