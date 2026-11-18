import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Adds an equipment category. onCreated receives the new name so the picker that asked can select it. */
export default function AddEquipmentCategoryDialog({ open, onOpenChange, existing = [], onCreated }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setError("");
    }
  }, [open]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a category name.");
    const match = existing.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (match) return setError(`"${match}" already exists. Pick it from the category list.`);
    setSaving(true);
    try {
      await base44.entities.CateringEquipmentCategory.create({ name: trimmed });
      await queryClient.invalidateQueries({ queryKey: ["catering-equipment-categories"] });
      toast.success(`Category "${trimmed}" added`);
      onCreated?.(trimmed);
      onOpenChange(false);
    } catch {
      setError("Could not add the category. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add equipment category</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-2">
          <Label htmlFor="equipment-category-name">Category name</Label>
          <Input
            id="equipment-category-name"
            autoFocus
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="Glassware, Linens…"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Adding…" : "Add category"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}