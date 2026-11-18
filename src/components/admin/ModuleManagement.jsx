import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, Info, Loader2, Save } from "lucide-react";
import { GROUP_ORDER, GROUP_LABELS, MODULE_PARENT, resolveModules } from "@/lib/moduleRegistry";
import useModuleSubTabs from "@/hooks/useModuleSubTabs";
import { toggleIn, setIn } from "@/lib/accessLists";
import { MODULES_QUERY_KEY, fetchModuleSettings } from "@/hooks/useModuleAccess";
import ModuleCard from "@/components/admin/modules/ModuleCard";
import { toast } from "sonner";

export default function ModuleManagement({ tabs = [] }) {
  const queryClient = useQueryClient();
  const allModules = useMemo(() => resolveModules(tabs), [tabs]);
  const { data: settings, isLoading } = useQuery({ queryKey: MODULES_QUERY_KEY, queryFn: fetchModuleSettings });
  const subTabs = useModuleSubTabs(allModules, tabs);

  const [draft, setDraft] = useState(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (draft || isLoading) return;
    setDraft({ modules: settings?.disabled_modules || [], tabs: settings?.disabled_tabs || [] });
  }, [settings, isLoading, draft]);

  const saveMutation = useMutation({
    mutationFn: async (d) => {
      const payload = { disabled_modules: d.modules, disabled_tabs: d.tabs };
      if (settings?.id) return base44.entities.SystemSettings.update(settings.id, payload);
      return base44.entities.SystemSettings.create({ setting_key: "default", ...payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODULES_QUERY_KEY });
      toast.success("Module access saved");
    },
    onError: (e) => toast.error("Failed to save", { description: e.message }),
  });

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allModules;
    return allModules.filter((m) =>
      `${m.label} ${m.description} ${m.key}`.toLowerCase().includes(q) ||
      subTabs[m.key].some((t) => t.label.toLowerCase().includes(q))
    );
  }, [search, allModules, subTabs]);

  if (isLoading || !draft) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const isOpen = (key) => !draft.modules.includes(key);
  const parentOf = (key) => allModules.find((p) => p.key === MODULE_PARENT[key]);
  const openCount = allModules.filter((m) => isOpen(m.key) && (!MODULE_PARENT[m.key] || isOpen(MODULE_PARENT[m.key]))).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Modules
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Open or close any module, or any single sub-tab. Closed modules and sub-tabs are hidden for
            everyone, including admins.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-sm">{openCount} of {allModules.length} open</Badge>
          {draft.tabs.length > 0 && <Badge variant="outline" className="text-sm">{draft.tabs.length} sub-tabs closed</Badge>}
        </div>
      </div>

      <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          Closing a module hides its menu link and its page, and closes all of its sub-tabs. Nothing is
          deleted — switching it back on restores everything instantly.
        </span>
      </div>

      <div className="flex items-center gap-3 w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search modules and sub-tabs..."
          className="flex-1 bg-transparent border-0 outline-none text-sm"
        />
      </div>

      {GROUP_ORDER.map((group) => {
        const mods = filteredModules.filter((m) => m.group === group);
        if (mods.length === 0) return null;
        return (
          <div key={group} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{GROUP_LABELS[group]}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mods.map((m) => (
                <ModuleCard
                  key={m.key}
                  module={m}
                  open={isOpen(m.key)}
                  parent={parentOf(m.key)}
                  parentOpen={!MODULE_PARENT[m.key] || isOpen(MODULE_PARENT[m.key])}
                  subTabs={subTabs[m.key]}
                  closedTabs={draft.tabs}
                  onToggle={() => setDraft((d) => ({ ...d, modules: toggleIn(d.modules, m.key) }))}
                  onToggleTab={(id) => setDraft((d) => ({ ...d, tabs: toggleIn(d.tabs, id) }))}
                  onSetTabs={(ids, close) => setDraft((d) => ({ ...d, tabs: setIn(d.tabs, ids, close) }))}
                />
              ))}
            </div>
          </div>
        );
      })}
      {filteredModules.length === 0 && <p className="text-sm text-slate-500">No matching modules.</p>}

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending} className="gap-2 shadow-lg">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}