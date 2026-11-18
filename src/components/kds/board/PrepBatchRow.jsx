import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Pencil, Users } from "lucide-react";
import { stageOf, nextStage } from "./prepStages";

export default function PrepBatchRow({ batch, canEdit, onEdit, onChanged }) {
  const [busy, setBusy] = useState(false);
  const stage = stageOf(batch.prep_stage);
  const next = nextStage(batch.prep_stage);

  const advance = async () => {
    if (next.key === "handed_off") return onEdit(batch); // handoff needs a recipient
    setBusy(true);
    const me = await base44.auth.me();
    await base44.entities.ProductionOrder.update(batch.id, { prep_stage: next.key, prep_updated_by: me.email });
    setBusy(false);
    onChanged();
  };

  return (
    <div className="grid gap-3 md:grid-cols-[110px_1fr_1fr_auto] items-center p-4 border-b last:border-b-0">
      <div className="text-sm text-muted-foreground">{batch.needed_by_date || "—"}</div>
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">{batch.output_item_name || batch.recipe_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {batch.catering_event_name} · {batch.required_output_quantity || batch.target_quantity} {batch.output_unit || ""}
        </p>
        {batch.prep_notes && <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{batch.prep_notes}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={`${stage.cls} border-0`}>{stage.label}</Badge>
        {batch.handoff_to && <span className="text-xs text-muted-foreground">→ {batch.handoff_to}</span>}
        <span className="flex items-center gap-1 text-xs text-muted-foreground w-full">
          <Users className="w-3.5 h-3.5" />
          {batch.assigned_staff?.length ? batch.assigned_staff.map((s) => s.name).join(", ") : "Unassigned"}
        </span>
      </div>
      {canEdit && <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => onEdit(batch)}><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button>
        {next && (
          <Button size="sm" onClick={advance} disabled={busy}>
            {next.label}<ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
      </div>}
    </div>
  );
}