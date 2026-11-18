import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import CartDateInput from "./CartDateInput";
import { eventCartStatus } from "./eventCartStatus";
import EventCartFlag from "./EventCartFlag";

/**
 * Only confirmed-or-better upcoming events are listed — speculative enquiries
 * must never drive real spend.
 */
export default function CartEventSelector({ events, cartOrders, selectedIds, onToggle, onSelectAll, onClear, from, to, onFrom, onTo }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <CartDateInput label="From" value={from} onChange={onFrom} />
        <CartDateInput label="To" value={to} onChange={onTo} />
        <Button size="sm" variant="ghost" onClick={() => { onFrom(""); onTo(""); }} disabled={!from && !to}>
          Clear dates
        </Button>
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={onSelectAll} disabled={!events.length}>
            Select all shown
          </Button>
          <Button size="sm" variant="outline" onClick={onClear} disabled={!selectedIds.length}>
            Clear
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">
          {from || to ? "No confirmed events in this date range." : "No confirmed events."}
        </p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {events.map((e) => (
            <label
              key={e.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Checkbox checked={selectedIds.includes(e.id)} onCheckedChange={() => onToggle(e.id)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">{e.event_name}</p>
                <p className="text-xs text-slate-500">
                  {e.event_date} · {Number(e.guarantee_locked ? e.guaranteed_guests : e.expected_guests) || 0} guests
                </p>
              </div>
              <EventCartFlag status={eventCartStatus(cartOrders, e.id)} />
              <Badge variant="outline" className="text-xs shrink-0">{e.status}</Badge>
            </label>
          ))}
        </div>
      )}
    </Card>
  );
}