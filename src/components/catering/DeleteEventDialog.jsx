import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import DeleteEventCensus from "./DeleteEventCensus";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function DeleteEventDialog({ event, open, onOpenChange, onDeleted }) {
  const [census, setCensus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open || !event?.id) return;
    setCensus(null); setError(""); setConfirmed(false); setLoading(true);
    base44.functions.invoke("manageCateringEventDeletion", { action: "preview", eventId: event.id })
      .then((response) => setCensus(response.data))
      .catch((requestError) => setError(requestError.response?.data?.error || "Could not check linked records"))
      .finally(() => setLoading(false));
  }, [open, event?.id]);

  const handleDelete = async (clickEvent) => {
    clickEvent.preventDefault();
    setDeleting(true);
    try {
      await base44.functions.invoke("manageCateringEventDeletion", { action: "delete", eventId: event.id });
      await queryClient.invalidateQueries({ queryKey: ["catering-events"] });
      toast.success(`"${event.event_name}" and its linked records were deleted`);
      onOpenChange(false);
      onDeleted?.(event.id);
    } catch (requestError) {
      const message = requestError.response?.data?.error || "Failed to delete event";
      toast.error(message);
      setError(message);
      if (requestError.response?.data?.blockers) setCensus(requestError.response.data);
    } finally { setDeleting(false); }
  };

  const canDelete = census?.canDelete && confirmed && !loading && !error;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{event?.event_name}”?</AlertDialogTitle>
          <AlertDialogDescription asChild><div><DeleteEventCensus loading={loading} error={error} census={census} /></div></AlertDialogDescription>
        </AlertDialogHeader>
        {census?.canDelete && <label className="flex items-start gap-2 text-sm"><Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} /><span>I understand this permanently deletes the event and every item listed above.</span></label>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Keep Event</AlertDialogCancel>
          {census?.canDelete && <AlertDialogAction onClick={handleDelete} disabled={!canDelete || deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? "Deleting…" : "Delete Event & Linked Records"}</AlertDialogAction>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}