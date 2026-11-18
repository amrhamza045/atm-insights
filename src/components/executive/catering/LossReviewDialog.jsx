import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import reviewDetails, { reviewMoney } from "@/components/executive/catering/reviewDetails";
import ReviewDetailsTables from "@/components/executive/catering/ReviewDetailsTables";

export default function LossReviewDialog({ selection, event, quote, onClose }) {
  const { line, action } = selection;
  const { isModuleEnabled, isLoading: modulesLoading } = useModuleAccess();
  const enabled = !modulesLoading && isModuleEnabled(line.key === "food_cost_variance" ? "menu" : "catering");
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["loss-review-details", event.id, line.key, quote?.id, event.updated_date],
    queryFn: () => reviewDetails(line.key, event, quote), enabled,
  });
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader className="pr-6">
          <DialogTitle>{action.label}</DialogTitle>
          <DialogDescription>{event.event_name} · {event.event_date} · Read-only review</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border bg-muted p-4 text-sm">
          <div><p className="text-muted-foreground">Stored expected amount</p><strong>{reviewMoney(line.expected_amount)}</strong></div>
          <div><p className="text-muted-foreground">Stored actual amount</p><strong>{reviewMoney(line.actual_amount)}</strong></div>
          <div><p className="text-muted-foreground">Impact on margin</p><strong>{reviewMoney(line.delta)}</strong></div>
        </div>
        {modulesLoading || (enabled && isLoading) ? <p role="status" className="text-sm text-muted-foreground">Loading review details…</p>
          : !enabled ? <p className="text-sm text-muted-foreground">This module is disabled.</p>
          : isError ? <div role="alert" className="space-y-2"><p>Could not load the review details.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>
          : <ReviewDetailsTables sections={data} />}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}