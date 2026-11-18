import { useState, useMemo, useEffect } from "react";
import { brandName } from "@/lib/brandName";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MANUAL_SECTIONS } from "@/components/kitchen_manual/MANUAL_SECTIONS";
import ManualProgressBar from "@/components/kitchen_manual/ManualProgressBar";
import ManualSectionCard from "@/components/kitchen_manual/ManualSectionCard";
import RecipeSectionCard from "@/components/kitchen_manual/RecipeSectionCard";
import CategoryMultiSelect from "@/components/kitchen_manual/CategoryMultiSelect";
import NewItemOnboardingProcess from "@/components/kitchen_manual/NewItemOnboardingProcess";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, UtensilsCrossed, Wine, Search, RefreshCw, ChefHat, FileText } from "lucide-react";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { useLanguage } from "@/components/LanguageProvider";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useActivePreparationAreas } from "@/components/hooks/usePreparationAreas";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";

const GROUPS = [...new Set(MANUAL_SECTIONS.map(s => s.group))];


export default function KitchenBarManual() {
  const queryClient = useQueryClient();
  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  // Access follows the kitchen_manual module: anyone it is closed for (globally
  // or per role/user) is sent back to CRM instead of seeing the manual.
  const { isModuleEnabled, isLoading: loadingModules } = useModuleAccess();
  const screenTabs = useScreenTabs("KitchenBarManual");
  useEffect(() => {
    if (!loadingModules && !isModuleEnabled("kitchen_manual")) navigate("/CRM", { replace: true });
  }, [loadingModules, isModuleEnabled, navigate]);

  const { language } = useLanguage();
  const lang = language === "ar" ? "ar" : "en";
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [requestedTab, setActiveTab] = useState("manual"); // "manual" | a station key
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState([]); // multi-select for item categories
  const isAr = lang === "ar";

  // Fetch all manual entries
  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["kitchenManual"],
    queryFn: () => base44.entities.KitchenManual.list(),
  });

  // Fetch all menu items
  const { data: menuItems = [], isLoading: loadingMenu } = useQuery({
    queryKey: ["menuItemsForManual"],
    queryFn: async () => {
      const items = await base44.entities.MenuItem.list();
      return items.filter(i => i.available !== false);
    },
  });

  const entryMap = useMemo(() => {
    const map = {};
    entries.forEach(e => { map[e.section_key] = e; });
    return map;
  }, [entries]);

  // Group menu items by preparation_station
  const prepAreas = useActivePreparationAreas();
  const STATION_CONFIG = useMemo(() => Object.fromEntries(prepAreas.map(a => [a.key, {
    label_en: a.name, label_ar: a.name, icon: ChefHat, color: a.color || "#7c3030"
  }])), [prepAreas]);

  const itemsByStation = useMemo(() => {
    const groups = Object.fromEntries(prepAreas.map(a => [a.key, []]));
    menuItems.forEach(item => {
      if (groups[item.preparation_station]) groups[item.preparation_station].push(item);
    });
    return groups;
  }, [menuItems, prepAreas]);

  // All recipe section keys (for overall progress)
  const allRecipeKeys = useMemo(() => {
    const keys = [];
    Object.values(itemsByStation).forEach(items => {
      items.forEach(item => {
        keys.push(`recipe_${item.preparation_station}_${item.id}`);
      });
    });
    return keys;
  }, [itemsByStation]);

  // All section keys (manual + recipe)
  const allSectionKeys = useMemo(() => [
    ...MANUAL_SECTIONS.map(s => s.key),
    ...allRecipeKeys,
  ], [allRecipeKeys]);

  // Get entries for a set of keys
  const getEntriesForKeys = (keys) => keys.map(k => entryMap[k]).filter(Boolean);

  // Overall progress
  const overallEntries = allSectionKeys.map(k => entryMap[k]).filter(Boolean);
  const overallTotal = allSectionKeys.length;

  // Per-station progress
  const stationProgress = useMemo(() => {
    const result = {};
    Object.entries(itemsByStation).forEach(([station, items]) => {
      const keys = items.map(item => `recipe_${station}_${item.id}`);
      const approved = keys.filter(k => entryMap[k]?.status === "approved").length;
      result[station] = { total: items.length, approved, keys };
    });
    return result;
  }, [itemsByStation, entryMap]);

  // Categories per station
  const categoriesByStation = useMemo(() => {
    const result = {};
    Object.entries(itemsByStation).forEach(([station, items]) => {
      const cats = [...new Set(items.map(i => i.category || i.category_name).filter(Boolean))];
      result[station] = cats.sort();
    });
    return result;
  }, [itemsByStation]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["kitchenManual"] });
    queryClient.invalidateQueries({ queryKey: ["menuItemsForManual"] });
  };

  // Filtered manual sections
  const filteredSections = useMemo(() => {
    return MANUAL_SECTIONS.filter(s => {
      const matchGroup = activeGroup === "all" || s.group === activeGroup;
      const matchSearch = !search ||
        s.title_en.toLowerCase().includes(search.toLowerCase()) ||
        s.title_ar.includes(search);
      const entry = entryMap[s.key];
      const matchStatus = statusFilter === "all" || (entry?.status || "draft") === statusFilter;
      return matchGroup && matchSearch && matchStatus;
    });
  }, [search, activeGroup, statusFilter, entryMap]);

  // Filter items by station + selected categories + search
  const getFilteredItems = (station) => {
    let items = itemsByStation[station] || [];
    if (selectedCategories.length > 0) {
      items = items.filter(i => selectedCategories.includes(i.category || i.category_name));
    }
    if (search) {
      items = items.filter(i =>
        i.name?.toLowerCase().includes(search.toLowerCase()) ||
        (i.category || i.category_name)?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return items;
  };

  // Group items by category
  const groupItemsByCategory = (items, station) => {
    const groups = {};
    items.forEach(item => {
      const cat = item.category || item.category_name || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  };

  // Per-category progress for a station
  const getCategoryProgress = (station, categoryName) => {
    const items = (itemsByStation[station] || []).filter(i => (i.category || i.category_name) === categoryName);
    const keys = items.map(i => `recipe_${station}_${i.id}`);
    const approved = keys.filter(k => entryMap[k]?.status === "approved").length;
    return { total: items.length, approved, entries: keys.map(k => entryMap[k]).filter(Boolean) };
  };

  const loading = loadingEntries || loadingMenu;

  // Tab config
  const TABS = [
    { key: "manual", label_en: "Operations Manual", label_ar: "الدليل التشغيلي", icon: BookOpen },
    ...prepAreas.map(a => ({
      key: a.key,
      label_en: `${a.name} (${stationProgress[a.key]?.approved || 0}/${stationProgress[a.key]?.total || 0})`,
      label_ar: a.name,
      icon: ChefHat,
    })),
  ].filter((t) => screenTabs.isOpen(t.key));
  // Tabs closed in Admin › Modules are left out; a closed tab falls back to the first open one.
  const activeTab = screenTabs.pick(requestedTab, TABS.map((t) => t.key));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6" dir={isAr ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#7c3030] flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {isAr ? <>دليل مطبخ وبار <span data-no-translate dir="ltr">{brandName()}</span></> : `${brandName()} Kitchen & Bar Manual`}
            </h1>
            <p className="text-sm text-slate-500">
              {isAr ? "نظام إدارة الإجراءات التشغيلية الموحدة" : "Operations Manual System — All Sections"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={refreshAll} variant="outline" size="sm" className="gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Overall progress bar */}
      <ManualProgressBar
        entries={overallEntries}
        total={overallTotal}
        label={isAr ? "اكتمال الدليل الكلي" : "Overall Manual Completion"}
        lang={lang}
      />

      {/* Per-station mini progress bars */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Object.entries(STATION_CONFIG).filter(([station]) => screenTabs.isOpen(station)).map(([station, cfg]) => {
          const prog = stationProgress[station] || { approved: 0, total: 0 };
          const pct = prog.total > 0 ? Math.round((prog.approved / prog.total) * 100) : 0;
          return (
            <button
              key={station}
              onClick={() => setActiveTab(station)}
              className={`border rounded-lg p-3 text-left transition-colors ${activeTab === station ? "text-white" : "bg-white border-slate-200 hover:bg-slate-50"}`}
              style={activeTab === station ? { backgroundColor: cfg.color } : undefined}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <cfg.icon className="w-4 h-4" />
                  <span className="text-sm font-bold">{isAr ? cfg.label_ar : cfg.label_en}</span>
                </div>
                <span className="text-xs font-bold">{pct}%</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${activeTab === station ? "bg-white/30" : "bg-slate-100"}`}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: activeTab === station ? "#fff" : pct === 100 ? "#16a34a" : pct >= 50 ? "#d97706" : "#7c3030"
                  }}
                />
              </div>
              <div className={`text-[10px] mt-1 ${activeTab === station ? "text-white/80" : "text-slate-400"}`}>
                {prog.approved}/{prog.total} {isAr ? "معتمد" : "approved"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: isAr ? "إجمالي الأقسام" : "Total Sections", value: allSectionKeys.length, color: "text-slate-700" },
          { label: isAr ? "معتمد" : "Approved", value: entries.filter(e => e.status === "approved").length, color: "text-green-600" },
          { label: isAr ? "بانتظار الموافقة" : "Pending", value: entries.filter(e => e.status === "pending_approval").length, color: "text-warning-600" },
          { label: isAr ? "عناصر القائمة" : "Menu Items", value: menuItems.length, color: "text-blue-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* New Item Onboarding Process */}
      <div className="mb-6">
        <NewItemOnboardingProcess lang={lang} />
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelectedCategories([]); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "border-[#7c3030] text-[#7c3030]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4 flex-shrink-0" />
            {isAr ? tab.label_ar : tab.label_en}
          </button>
        ))}
      </div>

      {TABS.length === 0 && !loading && <ClosedTabsNotice />}

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-slate-900">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isAr ? "بحث..." : "Search sections or items..."}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm py-2"
          />
        </div>
        {activeTab === "manual" && (
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
          >
            <option value="all">{isAr ? "جميع الحالات" : "All Statuses"}</option>
            <option value="draft">{isAr ? "مسودة" : "Draft"}</option>
            <option value="pending_approval">{isAr ? "بانتظار الموافقة" : "Pending"}</option>
            <option value="approved">{isAr ? "معتمد" : "Approved"}</option>
            <option value="needs_revision">{isAr ? "يحتاج مراجعة" : "Needs Revision"}</option>
          </select>
        )}
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#7c3030] rounded-full animate-spin mx-auto mb-2" />
          {isAr ? "جارٍ التحميل..." : "Loading..."}
        </div>
      )}

      {/* MANUAL TAB */}
      {!loading && activeTab === "manual" && (
        <div className="space-y-6">
          {/* Group filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveGroup("all")}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${activeGroup === "all" ? "bg-[#7c3030] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {isAr ? "الكل" : "All"}
            </button>
            {GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${activeGroup === g ? "bg-[#7c3030] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Group sections */}
          {GROUPS.filter(g => activeGroup === "all" || g === activeGroup).map(group => {
            const secs = filteredSections.filter(s => s.group === group);
            if (secs.length === 0) return null;
            const groupEntries = secs.map(s => entryMap[s.key]).filter(Boolean);
            return (
              <div key={group}>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-sm font-bold text-[#7c3030] uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#7c3030] inline-block" />
                    {group}
                  </h2>
                  <div className="flex-1 max-w-[120px]">
                    <ManualProgressBar
                      entries={groupEntries}
                      total={secs.length}
                      lang={lang}
                      compact
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    {groupEntries.filter(e => e?.status === "approved").length}/{secs.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {secs.map(section => (
                    <ManualSectionCard
                      key={section.key}
                      section={section}
                      entry={entryMap[section.key]}
                      onSaved={() => queryClient.invalidateQueries({ queryKey: ["kitchenManual"] })}
                      isAdmin={isAdmin || permissions?.menu_edit === true}
                      lang={lang}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredSections.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              {isAr ? "لا توجد أقسام تطابق البحث" : "No sections match your search"}
            </div>
          )}
        </div>
      )}

      {/* KITCHEN / BAR TABS */}
      {!loading && activeTab !== "manual" && STATION_CONFIG[activeTab] && (() => {
        const station = activeTab;
        const cfg = STATION_CONFIG[station];
        const allStationItems = itemsByStation[station] || [];
        const filteredItems = getFilteredItems(station);
        const itemGroups = groupItemsByCategory(filteredItems, station);
        const prog = stationProgress[station] || { approved: 0, total: 0 };

        return (
          <div className="space-y-6">
            {/* Station progress bar */}
            <ManualProgressBar
              entries={getEntriesForKeys(prog.keys)}
              total={prog.total}
              label={`${isAr ? cfg.label_ar : cfg.label_en} ${isAr ? "اكتمال" : "Completion"}`}
              lang={lang}
            />

            {/* Category multi-select filter */}
            {categoriesByStation[station]?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-600">{isAr ? "تصفية حسب الصنف" : "Filter by Item Category"}</span>
                  {selectedCategories.length > 0 && (
                    <span className="text-xs text-slate-400">
                      ({selectedCategories.length} {isAr ? "محدد" : "selected"})
                    </span>
                  )}
                </div>
                <CategoryMultiSelect
                  categories={categoriesByStation[station]}
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                  lang={lang}
                />
              </div>
            )}

            {/* Items grouped by category with per-category progress */}
            {Object.entries(itemGroups).map(([cat, items]) => {
              const catProg = getCategoryProgress(station, cat);
              const catEntries = catProg.entries;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: cfg.color }}>
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cfg.color }} />
                      {cat}
                    </h2>
                    <div className="flex-1 max-w-[120px]">
                      <ManualProgressBar
                        entries={catEntries}
                        total={catProg.total}
                        lang={lang}
                        compact
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      {catProg.approved}/{catProg.total} {isAr ? "معتمد" : "approved"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <RecipeSectionCard
                        key={item.id}
                        menuItem={item}
                        entry={entryMap[`recipe_${station}_${item.id}`]}
                        onSaved={() => queryClient.invalidateQueries({ queryKey: ["kitchenManual"] })}
                        isAdmin={isAdmin || permissions?.menu_edit === true}
                        lang={lang}
                        allEntries={entries}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">
                {isAr ? "لا توجد عناصر" : "No items found"}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}