import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import EventAutocomplete from "./EventAutocomplete";
import PaymentEntryForm from "../PaymentEntryForm";

// One popup: pick the event, then enter the deposit right below. The page scopes to the event in the background.
export default function RecordDepositPicker({ open, onOpenChange, onPick }) {
  const [picked, setPicked] = useState(null);
  // Scope the page to the event only once the popup closes; switching tabs earlier unmounts this popup.
  const close = () => { if (picked) onPick(picked.id); setPicked(null); onOpenChange(false); };
  const pick = setPicked;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Deposit</DialogTitle></DialogHeader>
        <EventAutocomplete picked={picked} onPick={pick} />
        {picked ? (
          <PaymentEntryForm key={picked.id} event={picked} onDone={close} onCancel={close} />
        ) : (
          <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button></DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}