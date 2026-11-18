import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// Lets the admin pick which manual sections (modules) to generate.
// The selection is language-independent — it applies to both EN & AR generation.
export default function ModuleSelectDialog({ isRTL, initialSelection, onSave, onClose }) {
  const { data: modules, isLoading } = useQuery({
    queryKey: ["manualModuleList"],
    queryFn: async () => {
      const res = await base44.functions.invoke("generateVeraKit360Manual", { list_modules: true });
      return res.data?.modules || [];
    },
  });

  const [selected, setSelected] = useState(() => new Set(initialSelection || []));

  // No saved selection = all modules selected
  useEffect(() => {
    if (modules && initialSelection == null) {
      setSelected(new Set(modules.map((m) => m.name)));
    }
  }, [modules, initialSelection]);

  const grouped = useMemo(() => {
    const g = {};
    (modules || []).forEach((m) => {
      const group = m.chapter ? `${m.chapter_code} ${m.domain} › ${m.chapter}` : m.category;
      if (!g[group]) g[group] = [];
      g[group].push(m.name);
    });
    return g;
  }, [modules]);

  const toggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleCategory = (names) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = names.every((n) => next.has(n));
      names.forEach((n) => (allOn ? next.delete(n) : next.add(n)));
      return next;
    });
  };

  const total = modules?.length || 0;

  const handleSave = () => {
    // Full selection = null (generate everything)
    onSave(selected.size === total ? null : [...selected]);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRTL ? "اختيار أقسام الدليل" : "Choose Manual Sections"}
            <Badge variant="secondary">{selected.size} / {total}</Badge>
          </DialogTitle>
          <p className="text-xs text-slate-500">
            {isRTL
              ? "ينطبق اختيارك على توليد النسختين العربية والإنجليزية."
              : "Your selection applies to both the Arabic and English manual generation."}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set(modules.map((m) => m.name)))}>
                {isRTL ? "تحديد الكل" : "Select All"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                {isRTL ? "إلغاء الكل" : "Clear All"}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 mt-2">
              {Object.entries(grouped).map(([cat, names]) => (
                <div key={cat}>
                  <button
                    onClick={() => toggleCategory(names)}
                    className="text-xs font-semibold uppercase text-slate-500 hover:text-blue-600 mb-1.5"
                  >
                    {cat} ({names.filter((n) => selected.has(n)).length}/{names.length})
                  </button>
                  <div className="space-y-1">
                    {names.map((name) => (
                      <label key={name} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 cursor-pointer text-sm">
                        <Checkbox checked={selected.has(name)} onCheckedChange={() => toggle(name)} />
                        <span className="text-slate-700">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={onClose}>{isRTL ? "إلغاء" : "Cancel"}</Button>
          <Button onClick={handleSave} disabled={selected.size === 0} className="bg-blue-600 hover:bg-blue-700">
            {isRTL ? `حفظ الاختيار (${selected.size})` : `Save Selection (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}