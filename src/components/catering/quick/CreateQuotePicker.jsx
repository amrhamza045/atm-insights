import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EventAutocomplete from "./EventAutocomplete";
import QuoteFormDialog from "../QuoteFormDialog";

// Existing event → scoped Quotes tab with a new quote open. New name → draft quote, event details after.
export default function CreateQuotePicker({ open, onOpenChange, onExisting, onCreated }) {
  const [draftName, setDraftName] = useState(null);
  const close = () => onOpenChange(false);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Quote</DialogTitle></DialogHeader>
          <EventAutocomplete
            allowNew
            picked={null}
            onPick={(ev) => { if (ev) { close(); onExisting(ev.id); } }}
            onNew={(name) => { close(); setDraftName(name); }}
          />
          <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <QuoteFormDialog
        open={!!draftName}
        onOpenChange={(v) => !v && setDraftName(null)}
        event={draftName ? { event_name: draftName, expected_guests: 0, deposit_percentage: 50 } : null}
        nextRevision={1}
        activeQuote={null}
        draftEvent
        onEventCreated={(id) => { setDraftName(null); onCreated(id); }}
      />
    </>
  );
}