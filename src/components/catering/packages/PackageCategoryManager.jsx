import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  FolderKanban,
  Plus,
  Pencil,
  Check,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export default function PackageCategoryManager({
  packages = [],
  selectedCategory,
  onSelectCategory,
  canEdit = true,
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: options = [] } = useQuery({
    queryKey: ["catering-options", "package_category"],
    queryFn: () =>
      base44.entities.CateringOption.filter(
        { list_type: "package_category" },
        "sort_order",
        200
      ),
  });

  const countsByCategory = packages.reduce((acc, pkg) => {
    const key = pkg.package_category || "Uncategorized";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Combine formal CateringOption categories with any category string present on existing packages
  const optionNames = new Set(options.map((o) => o.name));
  const orphanNames = Object.keys(countsByCategory).filter(
    (c) => c !== "Uncategorized" && !optionNames.has(c)
  );

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catering-options", "package_category"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-packages"] }),
      queryClient.invalidateQueries({ queryKey: ["cateringPackages", "public"] }),
    ]);
  };

  const handleAddCategory = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (options.some((o) => o.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("This category already exists");
      return;
    }
    setBusy(true);
    try {
      await base44.entities.CateringOption.create({
        list_type: "package_category",
        name: trimmed,
        is_active: true,
        sort_order: options.length + 1,
      });
      setNewName("");
      await refreshAll();
      toast.success(`Category "${trimmed}" created`);
    } catch (e) {
      toast.error(e.message || "Could not create category");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveRename = async (opt) => {
    const next = editingName.trim();
    if (!next || next === opt.name) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    try {
      await base44.entities.CateringOption.update(opt.id, { name: next });
      const matchingPackages = packages.filter((p) => p.package_category === opt.name);
      if (matchingPackages.length > 0) {
        await base44.entities.CateringPackage.bulkUpdate(
          matchingPackages.map((p) => ({ id: p.id, package_category: next }))
        );
      }
      if (selectedCategory === opt.name) onSelectCategory(next);
      setEditingId(null);
      await refreshAll();
      toast.success(`Renamed category to "${next}"`);
    } catch (e) {
      toast.error(e.message || "Could not rename category");
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (index, delta) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= options.length) return;
    const reordered = [...options];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setBusy(true);
    try {
      await base44.entities.CateringOption.bulkUpdate(
        reordered.map((item, idx) => ({ id: item.id, sort_order: idx + 1 }))
      );
      await refreshAll();
    } catch (e) {
      toast.error(e.message || "Could not reorder categories");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (opt) => {
    setBusy(true);
    try {
      await base44.entities.CateringOption.update(opt.id, {
        is_active: !(opt.is_active !== false),
      });
      await refreshAll();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (opt) => {
    const usedCount = countsByCategory[opt.name] || 0;
    if (usedCount > 0) {
      toast.error(
        `Cannot delete "${opt.name}" while ${usedCount} package(s) are assigned to it.`
      );
      return;
    }
    setBusy(true);
    try {
      await base44.entities.CateringOption.delete(opt.id);
      if (selectedCategory === opt.name) onSelectCategory("__all__");
      await refreshAll();
      toast.success(`Category "${opt.name}" deleted`);
    } finally {
      setBusy(false);
    }
  };

  const allCategoryNames = [
    ...options.filter((o) => o.is_active !== false).map((o) => o.name),
    ...orphanNames,
  ];

  return (
    <Card className="p-4 border-[#e5dfd2] bg-[#fffefa]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={selectedCategory === "__all__" ? "default" : "outline"}
            className="h-8 text-xs rounded-full"
            onClick={() => onSelectCategory("__all__")}
          >
            All Categories <span className="ml-1 opacity-75">({packages.length})</span>
          </Button>
          {allCategoryNames.map((name) => (
            <Button
              key={name}
              size="sm"
              variant={selectedCategory === name ? "default" : "outline"}
              className="h-8 text-xs rounded-full"
              onClick={() => onSelectCategory(name)}
            >
              {name} <span className="ml-1 opacity-75">({countsByCategory[name] || 0})</span>
            </Button>
          ))}
          {countsByCategory.Uncategorized > 0 && (
            <Button
              size="sm"
              variant={selectedCategory === "Uncategorized" ? "default" : "outline"}
              className="h-8 text-xs rounded-full"
              onClick={() => onSelectCategory("Uncategorized")}
            >
              Uncategorized <span className="ml-1 opacity-75">({countsByCategory.Uncategorized})</span>
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setExpanded((v) => !v)}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          Manage Categories ({options.length})
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#e8e1d3] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Package Categories</h4>
              <p className="text-xs text-slate-500">
                Create, rename, reorder, or toggle categories shown in Catering and on the public landing page.
              </p>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                  placeholder="New category name (e.g. Corporate, VIP)"
                  className="h-8 w-64 text-xs bg-white"
                />
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={handleAddCategory}
                  disabled={busy || !newName.trim()}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Category
                </Button>
              </div>
            )}
          </div>

          {options.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No categories configured yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {options.map((opt, idx) => {
                const isEditing = editingId === opt.id;
                const count = countsByCategory[opt.name] || 0;
                return (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveRename(opt)}
                            className="h-7 text-xs"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-600"
                            onClick={() => handleSaveRename(opt)}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-slate-500"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`text-sm font-medium truncate ${
                              opt.is_active === false ? "text-slate-400 line-through" : "text-slate-800"
                            }`}
                          >
                            {opt.name}
                          </span>
                          <Badge variant="secondary" className="text-[11px] shrink-0">
                            {count} pkg{count === 1 ? "" : "s"}
                          </Badge>
                        </>
                      )}
                    </div>

                    {canEdit && !isEditing && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={idx === 0 || busy}
                          onClick={() => handleMove(idx, -1)}
                          title="Move earlier"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={idx === options.length - 1 || busy}
                          onClick={() => handleMove(idx, 1)}
                          title="Move later"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingId(opt.id);
                            setEditingName(opt.name);
                          }}
                          title="Rename category"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Switch
                          checked={opt.is_active !== false}
                          onCheckedChange={() => handleToggleActive(opt)}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500"
                          onClick={() => handleDelete(opt)}
                          title="Delete category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}