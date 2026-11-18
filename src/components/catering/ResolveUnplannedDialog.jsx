import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MenuItemPicker from "./MenuItemPicker";
import { hasStockableRecipe } from "./planningGaps";

/** Shown when planning finds nothing reservable: link each gap to a recipe item or mark it manually sourced. */
export default function ResolveUnplannedDialog({ open, onOpenChange, quote, gaps, menuItems, onResolved }) {
  const [choices, setChoices] = useState({}); // index -> { menu_item_id } | { manual: true }
  const [saving, setSaving] = useState(false);
  const plannable = menuItems.filter(hasStockableRecipe);
  const set = (i, v) => setChoices((c) => ({ ...c, [i]: v }));

  const save = async () => {
    setSaving(true);
    const user = await base44.auth.me();
    const lines = (quote.line_items || []).map((li, i) => {
      const c = choices[i];
      if (!c) return li;
      if (c.manual) return { ...li, manually_sourced: true, manually_sourced_by: user?.email || "", manually_sourced_date: new Date().toISOString() };
      return { ...li, item_type: "menu_item", menu_item_id: c.menu_item_id, manually_sourced: false };
    });
    await base44.entities.CateringQuote.update(quote.id, { line_items: lines });
    setSaving(false);
    setChoices({});
    toast.success("Lines updated — you can generate the plan again");
    onResolved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nothing on this quote can be planned yet</DialogTitle>
          <DialogDescription>Link each line to a menu item with a recipe, or mark it as manually sourced.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {gaps.map((g) => {
            const c = choices[g.index];
            return (
              <div key={g.index} className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium text-slate-900">{g.name} <span className="text-xs text-amber-700 font-normal">· {g.reason}</span></p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[220px]">
                    <MenuItemPicker items={plannable} value={c?.menu_item_id || ""} onChange={(v) => set(g.index, { menu_item_id: v })} placeholder="Link to menu item with recipe" />
                  </div>
                  <Button size="sm" variant={c?.manual ? "default" : "outline"} onClick={() => set(g.index, c?.manual ? undefined : { manual: true })}>
                    {c?.manual ? "Manually sourced ✓" : "Mark manually sourced"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !Object.values(choices).some(Boolean)}>{saving ? "Saving…" : "Save resolutions"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}