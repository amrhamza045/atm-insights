import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, PlusCircle, ShieldAlert, Wallet } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

/**
 * Displays the event's system-calculated minimum baseline vs confirmed requisition quantities,
 * and the event's additional requisition money allowance & remaining balance.
 */
export default function EventRequisitionMinimumsBanner({
  summary,
  canCreateAdditional = false,
  creating = false,
  onCreateFromShortfalls,
  onCreateBlankAdditional,
}) {
  if (!summary) return null;

  const {
    baselineItems = [],
    shortfalls = [],
    allowanceConfigured,
    allowanceUsed = 0,
    allowanceRemaining,
    hasConfirmedPrimary = false,
    hasOpenAdditional = false,
    openAdditionalNumber = "",
    quoteRevision,
  } = summary;

  const hasShortfalls = shortfalls.length > 0;
  const allowanceExhausted = allowanceConfigured != null && Number(allowanceRemaining) <= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {hasShortfalls ? (
            <Badge className="gap-1 bg-warning-100 text-warning-900 hover:bg-warning-100 border border-warning-300">
              <AlertTriangle className="w-3.5 h-3.5 text-warning-700" />
              {shortfalls.length} item(s) below system minimum
            </Badge>
          ) : baselineItems.length > 0 ? (
            <Badge className="gap-1 bg-success-100 text-success-800 hover:bg-success-100 border border-success-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              System minimum met ({baselineItems.length} item{baselineItems.length === 1 ? "" : "s"})
            </Badge>
          ) : (
            <Badge variant="outline">No system minimum snapshot yet</Badge>
          )}
          {quoteRevision != null && quoteRevision > 0 && (
            <span className="text-xs text-muted-foreground">
              Baseline from approved Quote #{quoteRevision}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
            <Wallet className="w-3.5 h-3.5 text-primary" />
            Additional allowance:{" "}
            {allowanceConfigured == null ? "0.00 EGP (approval required)" : formatCurrency(allowanceConfigured)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1">
            Used: <strong>{formatCurrency(allowanceUsed)}</strong>
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold ${
              allowanceExhausted
                ? "bg-danger-100 text-danger-800"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            Remaining: {formatCurrency(allowanceRemaining ?? 0)}
          </span>
        </div>
      </div>

      {hasShortfalls && (
        <div className="rounded-lg border border-warning-200 bg-warning-50/70 p-2.5 space-y-1.5">
          <p className="text-xs font-semibold text-warning-900">
            Confirmed requisitions for this event are below the system-calculated minimum for the latest approved quote:
          </p>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {shortfalls.map((item) => (
              <div
                key={item.key || item.inventory_item_id}
                className="flex items-center justify-between gap-2 rounded bg-white/90 px-2.5 py-1 text-xs border border-warning-200/80"
              >
                <span className="font-medium text-slate-900 truncate">
                  {item.inventory_item_name}
                  {item.produced_item_name ? ` (for ${item.produced_item_name})` : ""}
                </span>
                <span className="whitespace-nowrap font-mono text-warning-900">
                  Confirmed {item.confirmed_quantity} / Min {item.minimum_quantity} {item.unit} ·{" "}
                  <strong className="text-danger-700">Need {item.shortfall_quantity} {item.unit}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allowanceExhausted && hasConfirmedPrimary && (
        <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/80 border border-amber-200 rounded-md px-2.5 py-1.5">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
          <span>
            Additional requisition allowance is exhausted. Any further requisition will be routed to the Approval Center before Inventory negotiation begins.
          </span>
        </div>
      )}

      {hasConfirmedPrimary && canCreateAdditional && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border">
          {hasOpenAdditional ? (
            <span className="text-xs text-muted-foreground">
              Open additional requisition <strong>{openAdditionalNumber}</strong> is currently in progress for this event.
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {hasShortfalls && onCreateFromShortfalls && (
                <Button
                  size="sm"
                  disabled={creating}
                  onClick={onCreateFromShortfalls}
                  className="gap-1.5 bg-warning-600 hover:bg-warning-700 text-white"
                >
                  <PlusCircle className="w-4 h-4" />
                  Request remaining minimum items ({shortfalls.length})
                </Button>
              )}
              {onCreateBlankAdditional && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={creating}
                  onClick={onCreateBlankAdditional}
                  className="gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  New additional requisition
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}