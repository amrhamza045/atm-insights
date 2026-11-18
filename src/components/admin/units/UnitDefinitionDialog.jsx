import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Plus, X, Tags } from "lucide-react";
import { DIMENSION_LABELS, normalizeUnit } from "@/lib/unitConversion";

export default function UnitDefinitionDialog({
  open,
  onOpenChange,
  editingUnit,
  form,
  setForm,
  formError,
  setFormError,
  onSave,
  isSaving,
}) {
  const [aliasDraft, setAliasDraft] = useState("");

  const addAliasFromDraft = () => {
    const parts = aliasDraft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setFormError("");
    setForm((prev) => {
      const existing = Array.isArray(prev.aliases) ? prev.aliases : [];
      const lowerSet = new Set(existing.map((a) => a.toLowerCase()));
      const next = [...existing];
      for (const p of parts) {
        if (!lowerSet.has(p.toLowerCase())) {
          lowerSet.add(p.toLowerCase());
          next.push(p);
        }
      }
      return { ...prev, aliases: next };
    });
    setAliasDraft("");
  };

  const removeAlias = (target) => {
    setFormError("");
    setForm((prev) => ({
      ...prev,
      aliases: (prev.aliases || []).filter((a) => a !== target),
    }));
  };

  const previewCanonical = String(form.symbol || form.canonical_label || "").trim().toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingUnit ? `Edit Unit "${editingUnit.canonical_label || editingUnit.code}"` : "Add Unit to Unit Table"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
            Only the <strong>Canonical Unit Label</strong> is required. Any aliases you add (such as <span className="font-mono">pieces</span>, <span className="font-mono">piece</span>, <span className="font-mono">pc</span>) will automatically resolve to this canonical unit across Inventory, Manufacturing, KDS, Purchasing, and Unit Conversions.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-900">
                Canonical Unit Label <span className="text-red-600">*</span>
              </Label>
              <Input
                value={form.canonical_label}
                onChange={(e) => {
                  setFormError("");
                  setForm((prev) => ({ ...prev, canonical_label: e.target.value }));
                }}
                placeholder="e.g. pcs, kg, box, portion"
                className="mt-1 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Standard label saved across the system
              </p>
            </div>

            <div>
              <Label className="text-xs text-slate-700">
                Short Symbol <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                value={form.symbol}
                onChange={(e) => {
                  setFormError("");
                  setForm((prev) => ({ ...prev, symbol: e.target.value }));
                }}
                placeholder={form.canonical_label || "e.g. pcs"}
                className="mt-1 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Defaults to canonical label if left blank
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-700">
                Display Name <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
                placeholder="e.g. Piece (pcs), Kilogram"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-700">
                Arabic Label <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input
                value={form.arabic_label}
                onChange={(e) => setForm((prev) => ({ ...prev, arabic_label: e.target.value }))}
                placeholder="e.g. قطعة / كجم"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-700">
              Dimension <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Select
              value={form.dimension || "custom"}
              onValueChange={(v) => setForm((prev) => ({ ...prev, dimension: v }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-slate-700 flex items-center gap-1.5">
              <Tags className="w-3.5 h-3.5 text-slate-500" />
              Aliases / Alternative Wording <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={aliasDraft}
                onChange={(e) => setAliasDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAliasFromDraft();
                  }
                }}
                placeholder="Type alias(es) comma-separated, e.g. pieces, piece, pc"
                className="text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={addAliasFromDraft} className="shrink-0 gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
            {(form.aliases || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 p-2 rounded-md bg-slate-50 border border-slate-200">
                {(form.aliases || []).map((alias) => (
                  <Badge
                    key={alias}
                    variant="secondary"
                    className="gap-1 font-mono text-xs bg-white border border-slate-200 text-slate-700"
                  >
                    {alias}
                    <button
                      type="button"
                      onClick={() => removeAlias(alias)}
                      className="text-slate-400 hover:text-red-600 ml-0.5"
                      aria-label={`Remove alias ${alias}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {previewCanonical && (form.aliases || []).length > 0 && (
              <p className="text-[11px] text-emerald-700 mt-1 font-mono">
                {form.aliases.join(", ")} → {previewCanonical}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-slate-700">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Used for discrete count items across kitchen & purchasing"
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <Label className="text-sm">Active in Unit Pickers</Label>
              <p className="text-xs text-slate-500">
                When off, hidden from new selections while preserving existing items and conversion history
              </p>
            </div>
            <Switch
              checked={form.is_active !== false}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
            />
          </div>

          {formError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (aliasDraft.trim()) addAliasFromDraft();
              onSave();
            }}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {editingUnit ? "Save Unit" : "Create Unit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}