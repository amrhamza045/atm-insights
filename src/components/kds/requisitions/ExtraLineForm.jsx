import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { errorText, saveExtraLine } from "@/components/catering/requisition/requisitionApi";

const stockUnit = (item) => item?.selling_unit_label || item?.unit || "";

/** Add or edit one extra line, or edit the quantity of a planned line on a draft requisition. */
export default function ExtraLineForm({ requisition, line, onDone, onCancel }) {
  const isPlanned = line?.line_type === "planned";
  const items = useQuery({
    queryKey: ["requisition-branch-items", requisition.branch_id],
    queryFn: () => base44.entities.InventoryItem.filter({ branch_id: requisition.branch_id }, "name", 1000),
    enabled: !isPlanned,
  });
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState(line.inventory_item_id || "");
  const [qty, setQty] = useState(line.requested_quantity ?? "");
  const [note, setNote] = useState(line.chef_comment || "");
  const [busy, setBusy] = useState(false);
  const options = useMemo(() => (items.data || []).filter((i) => i.id === itemId || (i.name || "").toLowerCase().includes(search.toLowerCase())).slice(0, 200), [items.data, search, itemId]);
  const item = (items.data || []).find((i) => i.id === itemId);

  const save = async () => {
    if ((!isPlanned && !itemId) || !(Number(qty) > 0)) return toast.error("Enter a quantity above 0");
    setBusy(true);
    try {
      await saveExtraLine({
        requisition_id: requisition.id,
        action: line.id ? "update" : "add",
        line_id: line.id,
        inventory_item_id: itemId,
        quantity: Number(qty),
        note,
      });
      toast.success(isPlanned ? "Planned quantity updated" : line.id ? "Extra line updated" : "Extra line added");
      onDone();
    } catch (e) {
      toast.error(errorText(e, "Could not save the line"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <p className="text-sm font-medium">
        {isPlanned ? `Edit planned quantity · ${line.inventory_item_name}` : line.id ? "Edit extra item" : "Add extra item"}
      </p>
      {!isPlanned && (
        <>
          <Input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger><SelectValue placeholder={items.isLoading ? "Loading items…" : "Choose an inventory item"} /></SelectTrigger>
            <SelectContent className="max-h-72">{options.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
          </Select>
        </>
      )}
      <div className="flex items-center gap-2">
        <Input type="number" min="0" step="any" placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} className="w-36" />
        <span className="text-sm text-muted-foreground">{isPlanned ? (line.unit || "no unit") : (item ? stockUnit(item) || "no unit" : "")}</span>
      </div>
      <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={save}>Save</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}