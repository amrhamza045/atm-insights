import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import {
  Scale, Plus, Pencil, Trash2, ArrowLeftRight, ArrowRight, CheckCircle2,
  AlertTriangle, Search, Package, Sparkles, ShieldCheck, Info
} from "lucide-react";
import { toast } from "sonner";
import { logSuccess, logFailure } from "@/components/utils/auditLogHelper";
import UnitConversionDialog from "@/components/admin/units/UnitConversionDialog";
import UnitConversionTester from "@/components/admin/units/UnitConversionTester";
import UnitTableTab from "@/components/admin/units/UnitTableTab";
import UnitDefinitionDialog from "@/components/admin/units/UnitDefinitionDialog";
import {
  BUILTIN_UNITS,
  DEFAULT_GLOBAL_PAIRS,
  DIMENSION_LABELS,
  normalizeUnit,
  getUnitDimension,
  areDimensionsCompatible,
  getItemStockUnit,
  getItemCostUnit,
  convertQuantity,
  validateConversionRule,
  registerUnitCatalog,
  validateUnitDefinition,
  roundQty,
} from "@/lib/unitConversion";

export default function UnitConversionSettings() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState("unit_table");
  // Each tab can be closed in Admin › Modules, per role or per user.
  const convTabs = useScreenTabs("AdminUnitConversions");
  const shownSubTab = convTabs.pick(activeSubTab, ["unit_table", "global", "item", "gaps", "tester"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formError, setFormError] = useState("");

  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitFormError, setUnitFormError] = useState("");
  const [unitForm, setUnitForm] = useState({
    canonical_label: "",
    symbol: "",
    display_name: "",
    arabic_label: "",
    dimension: "count",
    aliases: [],
    notes: "",
    is_active: true,
  });

  const [form, setForm] = useState({
    scope: "global",
    inventory_item_id: "",
    inventory_item_name: "",
    from_unit: "kg",
    to_unit: "g",
    factor: "1000",
    bidirectional: true,
    is_active: true,
    notes: "",
  });

  const { data: unitDefinitions = [] } = useQuery({
    queryKey: ["unitDefinitions"],
    queryFn: async () => {
      try {
        if (!base44.entities.UnitDefinition) return [];
        return await base44.entities.UnitDefinition.list("canonical_label", 500);
      } catch {
        return [];
      }
    },
  });

  const catalogUnits = useMemo(
    () => registerUnitCatalog(unitDefinitions),
    [unitDefinitions]
  );

  const { data: customRules = [] } = useQuery({
    queryKey: ["unitConversionRules"],
    queryFn: async () => {
      try {
        return await base44.entities.UnitConversionRule.list("-created_date", 500);
      } catch {
        return [];
      }
    },
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItemsAllForUnits"],
    queryFn: async () => {
      try {
        return await base44.entities.InventoryItem.list("name", 1000);
      } catch {
        return [];
      }
    },
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipesAllForUnits"],
    queryFn: async () => {
      try {
        return await base44.entities.Recipe.list("-created_date", 500);
      } catch {
        return [];
      }
    },
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItemsAllForUnits"],
    queryFn: async () => {
      try {
        return await base44.entities.MenuItem.list("-created_date", 500);
      } catch {
        return [];
      }
    },
  });

  const invById = useMemo(() => new Map(inventoryItems.map((i) => [i.id, i])), [inventoryItems]);

  const { allKnownUnits, usageByUnit, unmappedRawLabels } = useMemo(() => {
    const activeCatalogCodes = new Set(
      catalogUnits.filter((u) => u.is_active !== false).map((u) => u.code)
    );
    const allCatalogCodes = new Set(catalogUnits.map((u) => u.code));
    const usage = new Map();
    const unmapped = new Set();

    const bump = (rawUnit, bucket) => {
      const cleanRaw = String(rawUnit || "").trim();
      if (!cleanRaw) return;
      const norm = normalizeUnit(cleanRaw);
      if (!norm) return;
      if (!allCatalogCodes.has(norm)) {
        unmapped.add(cleanRaw);
      }
      if (!usage.has(norm)) {
        usage.set(norm, { items: 0, recipes: 0, rules: 0, total: 0 });
      }
      const entry = usage.get(norm);
      entry[bucket] = (entry[bucket] || 0) + 1;
      entry.total += 1;
    };

    inventoryItems.forEach((item) => {
      const unitsOnItem = new Set(
        [item.unit, item.purchase_unit_label, item.selling_unit_label]
          .map((u) => String(u || "").trim())
          .filter(Boolean)
      );
      unitsOnItem.forEach((u) => bump(u, "items"));
    });

    recipes.forEach((r) => {
      if (r.output_unit) bump(r.output_unit, "recipes");
      (r.ingredients || []).forEach((ing) => {
        if (ing.unit) bump(ing.unit, "recipes");
      });
    });

    menuItems.forEach((m) => {
      (m.recipe || []).forEach((ing) => {
        if (ing.unit) bump(ing.unit, "recipes");
      });
    });

    customRules.forEach((r) => {
      if (r.from_unit) bump(r.from_unit, "rules");
      if (r.to_unit) bump(r.to_unit, "rules");
    });

    const knownSet = new Set([...activeCatalogCodes]);
    knownSet.delete("");
    return {
      allKnownUnits: [...knownSet].sort(),
      usageByUnit: usage,
      unmappedRawLabels: [...unmapped].sort(),
    };
  }, [catalogUnits, inventoryItems, recipes, menuItems, customRules]);

  const globalRules = useMemo(() => {
    const customGlobal = customRules.filter((r) => (r.scope || "global") === "global");
    return [...customGlobal, ...DEFAULT_GLOBAL_PAIRS];
  }, [customRules]);

  const itemRules = useMemo(() => customRules.filter((r) => r.scope === "item"), [customRules]);

  const missingConversions = useMemo(() => {
    const gaps = [];
    const seen = new Set();
    const recordGap = (prefix, contextLabel, item, fromUnit, toUnit) => {
      if (!fromUnit || !toUnit || normalizeUnit(fromUnit) === normalizeUnit(toUnit)) return;
      const check = convertQuantity(1, fromUnit, toUnit, { item, itemId: item.id, rules: customRules });
      if (!check.ok) {
        const key = `${prefix}:${item.id}:${normalizeUnit(fromUnit)}:${normalizeUnit(toUnit)}`;
        if (!seen.has(key)) {
          seen.add(key);
          gaps.push({
            key,
            context: contextLabel,
            sourceName: item.name,
            item,
            fromUnit,
            toUnit,
            reason: check.message,
            suggestedScope: areDimensionsCompatible(fromUnit, toUnit) ? "global" : "item",
          });
        }
      }
    };

    for (const item of inventoryItems) {
      recordGap("inv", "Inventory Buy vs Stock Unit", item, getItemCostUnit(item), getItemStockUnit(item));
    }
    for (const r of recipes) {
      if (r.status === "inactive") continue;
      for (const ing of r.ingredients || []) {
        const item = invById.get(ing.inventory_item_id);
        if (item) recordGap("rec", `Recipe "${r.name}"`, item, ing.unit || getItemStockUnit(item), getItemStockUnit(item));
      }
    }
    for (const m of menuItems) {
      for (const ing of m.recipe || []) {
        const item = invById.get(ing.inventory_item_id);
        if (item) recordGap("menu", `Menu Item "${m.name}"`, item, ing.unit || getItemStockUnit(item), getItemStockUnit(item));
      }
    }
    return gaps;
  }, [inventoryItems, recipes, menuItems, invById, customRules]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingRule?.id) return await base44.entities.UnitConversionRule.update(editingRule.id, payload);
      return await base44.entities.UnitConversionRule.create(payload);
    },
    onSuccess: (saved, payload) => {
      logSuccess(
        editingRule ? "update" : "create",
        "UnitConversionRule",
        `${editingRule ? "Updated" : "Created"} ${payload.scope} unit conversion: 1 ${payload.from_unit} = ${payload.factor} ${payload.to_unit}${payload.inventory_item_name ? ` (${payload.inventory_item_name})` : ""}`,
        { entityId: saved?.id || editingRule?.id }
      );
      queryClient.invalidateQueries({ queryKey: ["unitConversionRules"] });
      toast.success(editingRule ? "Conversion rule updated" : "Conversion rule created");
      setDialogOpen(false);
      setEditingRule(null);
    },
    onError: (err) => {
      logFailure(editingRule ? "update" : "create", "UnitConversionRule", "Failed to save conversion rule", err.message);
      toast.error(`Could not save rule: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (rule) => base44.entities.UnitConversionRule.delete(rule.id),
    onSuccess: (_, rule) => {
      logSuccess("delete", "UnitConversionRule", `Deleted conversion rule 1 ${rule.from_unit} = ${rule.factor} ${rule.to_unit}`, { entityId: rule.id });
      queryClient.invalidateQueries({ queryKey: ["unitConversionRules"] });
      toast.success("Conversion rule removed");
    },
    onError: (err) => toast.error(`Could not delete rule: ${err.message}`),
  });

  const openCreateDialog = (preset = {}) => {
    setEditingRule(null);
    setFormError("");
    setForm({
      scope: preset.scope || (activeSubTab === "item" ? "item" : "global"),
      inventory_item_id: preset.inventory_item_id || "",
      inventory_item_name: preset.inventory_item_name || "",
      from_unit: preset.from_unit || "kg",
      to_unit: preset.to_unit || "g",
      factor: preset.factor ? String(preset.factor) : "1000",
      bidirectional: preset.bidirectional !== false,
      is_active: true,
      notes: preset.notes || "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (rule) => {
    setEditingRule(rule);
    setFormError("");
    setForm({
      scope: rule.scope || "global",
      inventory_item_id: rule.inventory_item_id || "",
      inventory_item_name: rule.inventory_item_name || "",
      from_unit: rule.from_unit || "",
      to_unit: rule.to_unit || "",
      factor: String(rule.factor ?? ""),
      bidirectional: rule.bidirectional !== false,
      is_active: rule.is_active !== false,
      notes: rule.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSaveRule = () => {
    setFormError("");
    const validation = validateConversionRule({ ...form, id: editingRule?.id }, customRules);
    if (!validation.valid) {
      setFormError(validation.error);
      return;
    }
    saveMutation.mutate(validation.normalized);
  };

  const saveUnitMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingUnit?.record_id) {
        return await base44.entities.UnitDefinition.update(editingUnit.record_id, payload);
      }
      return await base44.entities.UnitDefinition.create(payload);
    },
    onSuccess: (saved, payload) => {
      logSuccess(
        editingUnit?.record_id ? "update" : "create",
        "UnitDefinition",
        `${editingUnit ? "Updated" : "Created"} canonical unit "${payload.canonical_label}" (aliases: ${(payload.aliases || []).join(", ")})`,
        { entityId: saved?.id || editingUnit?.record_id }
      );
      queryClient.invalidateQueries({ queryKey: ["unitDefinitions"] });
      toast.success(editingUnit ? `Unit "${payload.canonical_label}" updated` : `Unit "${payload.canonical_label}" added to Unit Table`);
      setUnitDialogOpen(false);
      setEditingUnit(null);
    },
    onError: (err) => {
      logFailure(editingUnit?.record_id ? "update" : "create", "UnitDefinition", "Failed to save unit definition", err.message);
      toast.error(`Could not save unit: ${err.message}`);
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (unit) => base44.entities.UnitDefinition.delete(unit.record_id),
    onSuccess: (_, unit) => {
      logSuccess("delete", "UnitDefinition", `Deleted custom unit "${unit.canonical_label || unit.code}"`, { entityId: unit.record_id });
      queryClient.invalidateQueries({ queryKey: ["unitDefinitions"] });
      toast.success(`Unit "${unit.canonical_label || unit.code}" removed`);
    },
    onError: (err) => toast.error(`Could not delete unit: ${err.message}`),
  });

  const openCreateUnitDialog = (preset = {}) => {
    setEditingUnit(null);
    setUnitFormError("");
    setUnitForm({
      canonical_label: preset.canonical_label || "",
      symbol: preset.symbol || "",
      display_name: preset.display_name || "",
      arabic_label: preset.arabic_label || "",
      dimension: preset.dimension || "count",
      aliases: Array.isArray(preset.aliases) ? preset.aliases : [],
      notes: preset.notes || "",
      is_active: true,
    });
    setUnitDialogOpen(true);
  };

  const openEditUnitDialog = (unit) => {
    setEditingUnit(unit);
    setUnitFormError("");
    setUnitForm({
      canonical_label: unit.canonical_label || unit.code || "",
      symbol: unit.symbol || unit.code || "",
      display_name: unit.display_name || unit.label || "",
      arabic_label: unit.arabic_label || "",
      dimension: unit.dimension || "custom",
      aliases: (unit.aliases || []).filter(
        (a) => a.toLowerCase() !== String(unit.canonical_label || unit.code || "").toLowerCase()
      ),
      notes: unit.notes || "",
      is_active: unit.is_active !== false,
    });
    setUnitDialogOpen(true);
  };

  const handleSaveUnit = () => {
    setUnitFormError("");
    const validation = validateUnitDefinition(
      {
        ...unitForm,
        id: editingUnit?.record_id || null,
        builtin_code: editingUnit?.is_builtin ? editingUnit.code : null,
        is_builtin_override: Boolean(editingUnit?.is_builtin),
      },
      unitDefinitions
    );
    if (!validation.valid) {
      setUnitFormError(validation.error);
      return;
    }
    saveUnitMutation.mutate(validation.normalized);
  };

  const handleToggleUnitActive = (unit) => {
    const nextActive = unit.is_active === false;
    setEditingUnit(unit);
    saveUnitMutation.mutate({
      canonical_label: unit.canonical_label || unit.code,
      symbol: unit.symbol || unit.code,
      display_name: unit.display_name || unit.label || unit.canonical_label || unit.code,
      arabic_label: unit.arabic_label || "",
      dimension: unit.dimension || "custom",
      aliases: unit.aliases || [unit.code],
      notes: unit.notes || "",
      is_active: nextActive,
    });
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredGlobal = globalRules.filter(
    (r) => !q || String(r.from_unit || "").toLowerCase().includes(q) || String(r.to_unit || "").toLowerCase().includes(q) || String(r.notes || "").toLowerCase().includes(q)
  );
  const filteredItemRules = itemRules.filter(
    (r) => !q || String(r.inventory_item_name || "").toLowerCase().includes(q) || String(r.from_unit || "").toLowerCase().includes(q) || String(r.to_unit || "").toLowerCase().includes(q) || String(r.notes || "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Global Unit Pairs</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{globalRules.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {customRules.filter((r) => (r.scope || "global") === "global").length} custom · {DEFAULT_GLOBAL_PAIRS.length} built-in
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Scale className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Item-Specific Rules</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{itemRules.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Package & cross-dimension rules</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Package className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm cursor-pointer hover:border-purple-300 transition-colors" onClick={() => setActiveSubTab("unit_table")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unit Table (Canonical)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {catalogUnits.filter((u) => u.is_active !== false).length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {unitDefinitions.length} custom/saved · {BUILTIN_UNITS.length} standard
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
          </CardContent>
        </Card>

        <Card className={`shadow-sm ${missingConversions.length > 0 ? "border-amber-300 bg-amber-50/40" : "border-emerald-200 bg-emerald-50/30"}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unresolved Unit Gaps</p>
              <p className={`text-2xl font-bold mt-1 ${missingConversions.length > 0 ? "text-amber-700" : "text-emerald-700"}`}>{missingConversions.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">{missingConversions.length === 0 ? "All active recipes & items aligned" : "Open Missing Conversions tab"}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${missingConversions.length > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
              {missingConversions.length > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-600" />
                System-Wide Unit Conversion Rules
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Precedence: 1. Item-Specific Rule → 2. Custom Global Unit Pair → 3. Built-in Standard Metric/Volume Table.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter units or items..." className="pl-9 h-9 text-sm" />
              </div>
              <Button size="sm" variant="outline" onClick={() => openCreateUnitDialog()} className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50">
                <Plus className="w-4 h-4" /> Add Unit
              </Button>
              <Button size="sm" onClick={() => openCreateDialog({ scope: "global" })} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="w-4 h-4" /> Add Global Pair
              </Button>
              <Button size="sm" variant="outline" onClick={() => openCreateDialog({ scope: "item" })} className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50">
                <Plus className="w-4 h-4" /> Add Item Conversion
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {!shownSubTab && <ClosedTabsNotice />}
          <Tabs value={shownSubTab || ""} onValueChange={setActiveSubTab} className={shownSubTab ? "space-y-4" : "hidden"}>
            <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto gap-1 bg-slate-100 p-1">
              {convTabs.isOpen("unit_table") && (
                <TabsTrigger value="unit_table" className="text-xs sm:text-sm">
                  Unit Table ({catalogUnits.filter((u) => u.is_active !== false).length})
                </TabsTrigger>
              )}
              {convTabs.isOpen("global") && <TabsTrigger value="global" className="text-xs sm:text-sm">Global Unit Pairs ({globalRules.length})</TabsTrigger>}
              {convTabs.isOpen("item") && <TabsTrigger value="item" className="text-xs sm:text-sm">Item-Specific Rules ({itemRules.length})</TabsTrigger>}
              {convTabs.isOpen("gaps") && <TabsTrigger value="gaps" className="text-xs sm:text-sm">Missing Conversions ({missingConversions.length})</TabsTrigger>}
              {convTabs.isOpen("tester") && <TabsTrigger value="tester" className="text-xs sm:text-sm">Live Calculator & Units</TabsTrigger>}
            </TabsList>

            <TabsContent value="unit_table" className="space-y-4">
              <UnitTableTab
                catalogUnits={catalogUnits}
                usageByUnit={usageByUnit}
                unmappedRawLabels={unmappedRawLabels}
                onOpenCreate={openCreateUnitDialog}
                onOpenEdit={openEditUnitDialog}
                onToggleActive={handleToggleUnitActive}
                onDeleteUnit={(unit) => deleteUnitMutation.mutate(unit)}
              />
            </TabsContent>

            <TabsContent value="global" className="space-y-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-start gap-2.5 text-xs text-slate-600">
                <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  Global unit pairs apply across the entire app whenever two units belong to compatible dimensions (such as <span className="font-semibold">kg ↔ g</span> or <span className="font-semibold">l ↔ ml</span>). Cross-dimension conversions (such as <span className="font-semibold">pcs ↔ g</span> or <span className="font-semibold">box ↔ kg</span>) depend on the specific product and are managed under <button type="button" onClick={() => setActiveSubTab("item")} className="text-blue-600 underline font-medium">Item-Specific Rules</button>.
                </div>
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Source Unit</th>
                      <th className="py-2.5 px-3 text-left">Direction</th>
                      <th className="py-2.5 px-3 text-left">Target Unit</th>
                      <th className="py-2.5 px-3 text-right">Factor</th>
                      <th className="py-2.5 px-3 text-left">Inverse Rate</th>
                      <th className="py-2.5 px-3 text-left">Dimension</th>
                      <th className="py-2.5 px-3 text-left">Type / Notes</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredGlobal.map((rule) => {
                      const dim = getUnitDimension(rule.from_unit);
                      const invFactor = rule.factor > 0 ? roundQty(1 / rule.factor, 6) : null;
                      return (
                        <tr key={rule.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-medium text-slate-900">1 <Badge variant="outline" className="ml-1 font-mono">{rule.from_unit}</Badge></td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {rule.bidirectional !== false ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-medium"><ArrowLeftRight className="w-3.5 h-3.5" /> Both ways</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 text-xs"><ArrowRight className="w-3.5 h-3.5" /> One way</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900"><Badge variant="outline" className="font-mono">{rule.to_unit}</Badge></td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">{Number(rule.factor).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-500 font-mono">{rule.bidirectional !== false && invFactor != null ? `1 ${rule.to_unit} = ${invFactor} ${rule.from_unit}` : "—"}</td>
                          <td className="py-2.5 px-3"><Badge variant="secondary" className="text-xs capitalize">{DIMENSION_LABELS[dim] || dim}</Badge></td>
                          <td className="py-2.5 px-3 text-xs text-slate-500">
                            {rule.is_builtin ? (
                              <span className="inline-flex items-center gap-1 text-slate-600"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />{rule.notes || "Built-in standard"}</span>
                            ) : (
                              <span>{rule.notes || "Custom global rule"}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {rule.is_builtin ? <span className="text-xs text-slate-400">System default</span> : (
                              <div className="inline-flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => openEditDialog(rule)}><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => deleteMutation.mutate(rule)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="item" className="space-y-3">
              <div className="rounded-lg bg-blue-50/60 border border-blue-200 p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-blue-900">
                  <strong>Item-Specific Rules</strong> override global rules and allow cross-dimension conversions for a specific inventory item (for example: <span className="font-mono">1 box = 20 kg</span>, <span className="font-mono">1 pack = 500 g</span>, or <span className="font-mono">1 pcs = 150 g</span>).
                </div>
                <Button size="sm" onClick={() => openCreateDialog({ scope: "item" })} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> New Item Rule
                </Button>
              </div>
              {filteredItemRules.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No item-specific conversion rules defined yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Add a rule whenever an item is bought, stocked, or used in recipes across custom packaging or cross-dimension units.</p>
                  <Button size="sm" onClick={() => openCreateDialog({ scope: "item" })} className="gap-1.5"><Plus className="w-4 h-4" /> Add Item-Specific Conversion</Button>
                </Card>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Inventory Item</th>
                        <th className="py-2.5 px-3 text-left">Conversion Rule</th>
                        <th className="py-2.5 px-3 text-left">Inverse</th>
                        <th className="py-2.5 px-3 text-left">Mode</th>
                        <th className="py-2.5 px-3 text-left">Notes</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredItemRules.map((rule) => {
                        const inv = invById.get(rule.inventory_item_id);
                        const isCross = !areDimensionsCompatible(rule.from_unit, rule.to_unit);
                        const invFactor = rule.factor > 0 ? roundQty(1 / rule.factor, 6) : null;
                        return (
                          <tr key={rule.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-900">{rule.inventory_item_name || inv?.name || rule.inventory_item_id}</div>
                              {inv && <div className="text-xs text-slate-500">Stock unit: <span className="font-mono">{getItemStockUnit(inv)}</span> · Cost unit: <span className="font-mono">{getItemCostUnit(inv)}</span></div>}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">1 {rule.from_unit} = {Number(rule.factor).toLocaleString(undefined, { maximumFractionDigits: 6 })} {rule.to_unit}</td>
                            <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{rule.bidirectional !== false && invFactor != null ? `1 ${rule.to_unit} = ${invFactor} ${rule.from_unit}` : "One-way only"}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant={isCross ? "default" : "secondary"} className={isCross ? "bg-purple-100 text-purple-800 hover:bg-purple-100" : ""}>
                                {isCross ? "Cross-dimension" : "Same dimension"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-slate-500">{rule.notes || "—"}</td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => openEditDialog(rule)}><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => deleteMutation.mutate(rule)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="gaps" className="space-y-3">
              {missingConversions.length === 0 ? (
                <Card className="p-8 text-center border-emerald-200 bg-emerald-50/30">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-emerald-900">All Inventory Items & Recipes Have Valid Unit Conversions</p>
                  <p className="text-xs text-emerald-700 mt-1">Every recipe ingredient and item buy/sell unit pair resolves cleanly through your configured rules.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    The following items or recipe ingredients use unit combinations that currently have no conversion rule. Click <strong>Define Rule</strong> on any row to pre-fill the exact conversion needed.
                  </p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Where Used</th>
                          <th className="py-2.5 px-3 text-left">Inventory Item</th>
                          <th className="py-2.5 px-3 text-left">Unresolved Pair</th>
                          <th className="py-2.5 px-3 text-left">Recommended Scope</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {missingConversions.map((gap) => (
                          <tr key={gap.key} className="hover:bg-amber-50/40">
                            <td className="py-2.5 px-3 text-xs font-medium text-slate-700">{gap.context}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">{gap.sourceName}</td>
                            <td className="py-2.5 px-3 font-mono text-xs">
                              <Badge variant="outline">{gap.fromUnit}</Badge>
                              <ArrowLeftRight className="w-3 h-3 inline mx-1.5 text-slate-400" />
                              <Badge variant="outline">{gap.toUnit}</Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className={gap.suggestedScope === "item" ? "border-blue-300 text-blue-700" : "border-emerald-300 text-emerald-700"}>
                                {gap.suggestedScope === "item" ? "Item-Specific Rule" : "Global Unit Pair"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={() =>
                                  openCreateDialog({
                                    scope: gap.suggestedScope,
                                    inventory_item_id: gap.item?.id || "",
                                    inventory_item_name: gap.item?.name || "",
                                    from_unit: normalizeUnit(gap.toUnit),
                                    to_unit: normalizeUnit(gap.fromUnit),
                                    factor: "",
                                    notes: `Created to resolve ${gap.context}`,
                                  })
                                }
                              >
                                <Plus className="w-3.5 h-3.5" /> Define Rule
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tester" className="space-y-4">
              <UnitConversionTester
                inventoryItems={inventoryItems}
                invById={invById}
                customRules={customRules}
                catalogUnits={catalogUnits}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <UnitConversionDialog
        open={dialogOpen}
        onOpenChange={(o) => !o && setDialogOpen(false)}
        editingRule={editingRule}
        form={form}
        setForm={setForm}
        formError={formError}
        setFormError={setFormError}
        inventoryItems={inventoryItems}
        invById={invById}
        allKnownUnits={allKnownUnits}
        catalogUnits={catalogUnits}
        onSave={handleSaveRule}
        isSaving={saveMutation.isPending}
      />

      <UnitDefinitionDialog
        open={unitDialogOpen}
        onOpenChange={(o) => !o && setUnitDialogOpen(false)}
        editingUnit={editingUnit}
        form={unitForm}
        setForm={setUnitForm}
        formError={unitFormError}
        setFormError={setUnitFormError}
        onSave={handleSaveUnit}
        isSaving={saveUnitMutation.isPending}
      />
    </div>
  );
}