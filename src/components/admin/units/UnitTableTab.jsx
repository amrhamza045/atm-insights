import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Search, ShieldCheck, CheckCircle2, Ban, ArrowRight, Sparkles, Tags
} from "lucide-react";
import { DIMENSION_LABELS, normalizeUnit } from "@/lib/unitConversion";

export default function UnitTableTab({
  catalogUnits = [],
  usageByUnit = new Map(),
  unmappedRawLabels = [],
  onOpenCreate,
  onOpenEdit,
  onToggleActive,
  onDeleteUnit,
}) {
  const [unitSearch, setUnitSearch] = useState("");
  const [dimensionFilter, setDimensionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [aliasTestInput, setAliasTestInput] = useState("");

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    return catalogUnits.filter((u) => {
      if (dimensionFilter !== "all" && u.dimension !== dimensionFilter) return false;
      if (statusFilter === "active" && u.is_active === false) return false;
      if (statusFilter === "inactive" && u.is_active !== false) return false;
      if (!q) return true;
      const hay = [
        u.code,
        u.canonical_label,
        u.symbol,
        u.display_name,
        u.arabic_label,
        u.notes,
        ...(u.aliases || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [catalogUnits, unitSearch, dimensionFilter, statusFilter]);

  const resolvedAliasPreview = useMemo(() => {
    const raw = aliasTestInput.trim();
    if (!raw) return null;
    const norm = normalizeUnit(raw);
    const match = catalogUnits.find(
      (u) => u.code.toLowerCase() === norm.toLowerCase() || (u.canonical_label || "").toLowerCase() === norm.toLowerCase()
    );
    return { raw, norm, match };
  }, [aliasTestInput, catalogUnits]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
            <Tags className="w-4 h-4 text-emerald-700" />
            Single Source of Truth for System-Wide Units (Inventory, Manufacturing, KDS, Purchasing & Conversions)
          </div>
          <p className="text-xs text-emerald-800">
            Each unit has one <strong>canonical label</strong> (such as <span className="font-mono font-semibold">pcs</span> or <span className="font-mono font-semibold">kg</span>) and optional <strong>aliases</strong> (such as <span className="font-mono">pieces</span>, <span className="font-mono">piece</span>, <span className="font-mono">pc</span>) so different wording never creates duplicate units.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Input
              value={aliasTestInput}
              onChange={(e) => setAliasTestInput(e.target.value)}
              placeholder='Test label (e.g. "pieces")...'
              className="h-8 text-xs w-48 bg-white"
            />
          </div>
          {resolvedAliasPreview && (
            <Badge
              variant="outline"
              className={
                resolvedAliasPreview.match
                  ? "bg-white border-emerald-300 text-emerald-800 font-mono text-xs py-1 px-2.5"
                  : "bg-amber-50 border-amber-300 text-amber-800 font-mono text-xs py-1 px-2.5"
              }
            >
              "{resolvedAliasPreview.raw}" <ArrowRight className="w-3 h-3 mx-1 inline" />{" "}
              {resolvedAliasPreview.match ? (
                <span>
                  {resolvedAliasPreview.match.canonical_label} (canonical)
                </span>
              ) : (
                <span>Unregistered label</span>
              )}
            </Badge>
          )}
          <Button
            size="sm"
            onClick={() => onOpenCreate()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Unit
          </Button>
        </div>
      </div>

      {unmappedRawLabels.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex flex-wrap items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Unrecognized unit labels found in records:</strong>
            </span>
            {unmappedRawLabels.map((lbl) => (
              <button
                key={lbl}
                type="button"
                onClick={() => onOpenCreate({ canonical_label: lbl, symbol: lbl })}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-amber-300 font-mono text-amber-900 hover:bg-amber-100 transition-colors"
                title="Click to register as a canonical unit or add as an alias to an existing unit"
              >
                + {lbl}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-amber-700">
            Click a label to add it to the Unit Table or edit an existing unit to add it as an alias.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={unitSearch}
              onChange={(e) => setUnitSearch(e.target.value)}
              placeholder="Search canonical label, symbol, or alias (e.g. pieces, pcs)..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Select value={dimensionFilter} onValueChange={setDimensionFilter}>
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <SelectValue placeholder="All Dimensions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dimensions</SelectItem>
              {Object.entries(DIMENSION_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units ({catalogUnits.length})</SelectItem>
              <SelectItem value="active">
                Active ({catalogUnits.filter((u) => u.is_active !== false).length})
              </SelectItem>
              <SelectItem value="inactive">
                Inactive ({catalogUnits.filter((u) => u.is_active === false).length})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{filteredUnits.length}</strong> of {catalogUnits.length} canonical units
        </div>
      </div>

      {filteredUnits.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm font-medium text-slate-700">No units match your search</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Try clearing your filter or add a new canonical unit to the Unit Table.
          </p>
          <Button size="sm" onClick={() => onOpenCreate()} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" /> Add Unit
          </Button>
        </Card>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2.5 px-3 text-left">Canonical Label</th>
                <th className="py-2.5 px-3 text-left">Display Name</th>
                <th className="py-2.5 px-3 text-left">Recognized Aliases (Resolve Here)</th>
                <th className="py-2.5 px-3 text-left">Dimension</th>
                <th className="py-2.5 px-3 text-left">System Usage</th>
                <th className="py-2.5 px-3 text-left">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUnits.map((unit) => {
                const usage = usageByUnit.get(unit.code) || { items: 0, recipes: 0, rules: 0, total: 0 };
                const aliasesToShow = (unit.aliases || []).filter(
                  (a) => a.toLowerCase() !== String(unit.canonical_label || unit.code).toLowerCase()
                );
                return (
                  <tr
                    key={unit.code}
                    className={`hover:bg-slate-50/80 ${unit.is_active === false ? "opacity-60 bg-slate-50/40" : ""}`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono font-bold text-slate-900 bg-white">
                          {unit.canonical_label || unit.code}
                        </Badge>
                        {unit.symbol && unit.symbol.toLowerCase() !== (unit.canonical_label || unit.code).toLowerCase() && (
                          <span className="text-xs font-mono text-slate-500">({unit.symbol})</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800">
                        {unit.display_name || unit.label || unit.canonical_label}
                      </div>
                      {unit.arabic_label && (
                        <div className="text-xs text-slate-500">{unit.arabic_label}</div>
                      )}
                      {unit.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{unit.notes}</div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {aliasesToShow.length === 0 ? (
                        <span className="text-xs text-slate-400">No extra aliases</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {aliasesToShow.map((alias) => (
                            <Badge
                              key={alias}
                              variant="secondary"
                              className="text-[11px] font-mono bg-slate-100 text-slate-700 font-normal"
                            >
                              {alias}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {DIMENSION_LABELS[unit.dimension] || unit.dimension || "Custom Unit"}
                      </Badge>
                    </td>

                    <td className="py-2.5 px-3 text-xs text-slate-600">
                      {usage.total > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {usage.items > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                              {usage.items} item{usage.items === 1 ? "" : "s"}
                            </span>
                          )}
                          {usage.recipes > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                              {usage.recipes} recipe{usage.recipes === 1 ? "" : "s"}
                            </span>
                          )}
                          {usage.rules > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                              {usage.rules} rule{usage.rules === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Unused</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {unit.is_active !== false ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-300 text-xs gap-1">
                            <Ban className="w-3 h-3" /> Inactive
                          </Badge>
                        )}
                        {unit.is_builtin && !unit.record_id && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400" title="Standard system unit">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onOpenEdit(unit)}
                          title="Edit unit & aliases"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onToggleActive(unit)}
                          className={unit.is_active !== false ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"}
                          title={unit.is_active !== false ? "Deactivate unit for new selections" : "Reactivate unit"}
                        >
                          {unit.is_active !== false ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </Button>
                        {unit.record_id && !unit.is_builtin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => onDeleteUnit(unit)}
                            title="Delete custom unit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}