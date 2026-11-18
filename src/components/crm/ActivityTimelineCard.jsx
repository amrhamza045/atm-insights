import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Plus, Info } from "lucide-react";
import { useClientCommunications } from "./useClientCommunications";
import TimelineEventRow from "./TimelineEventRow";
import LogInteractionDialog from "./LogInteractionDialog";

const PAGE_SIZE = 25;

export default function ActivityTimelineCard({ client, canLog, currentUser }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { events, isLoading } = useClientCommunications(client);
  const shown = events.slice(0, visible);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" /> Activity &amp; Communication
          {!isLoading && <span className="text-xs font-normal text-slate-500">({events.length})</span>}
        </CardTitle>
        {canLog && (
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Log
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500">No logged interactions or recorded messages for this client yet.</p>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {shown.map((e) => (
                <TimelineEventRow key={e.id} event={e} />
              ))}
            </div>
            {events.length > visible && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-xs"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Show {Math.min(PAGE_SIZE, events.length - visible)} older
              </Button>
            )}
          </>
        )}

        <p className="mt-3 flex gap-1.5 text-xs text-slate-500 border-t border-slate-100 pt-2">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Shows manually logged contact, client notifications, inbound WhatsApp messages matched by
            phone, and invitation sends. Outbound WhatsApp/SMS content is not stored by the sending
            system, so it cannot be shown here.
          </span>
        </p>
      </CardContent>

      {canLog && (
        <LogInteractionDialog open={open} onOpenChange={setOpen} client={client} currentUser={currentUser} />
      )}
    </Card>
  );
}