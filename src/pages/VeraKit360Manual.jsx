import { useState, useMemo, useEffect } from "react";
import { useQuery, QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { BookOpen, RefreshCw, FileDown, FileImage, Menu, X, Loader2, Languages, Camera, ChevronDown, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ManualSidebar from "@/components/manual/ManualSidebar";
import ManualContent from "@/components/manual/ManualContent";
import { exportManualToPDF } from "@/components/manual/ManualPdfExporter";
import ScreenshotCaptureDialog from "@/components/manual/ScreenshotCaptureDialog";
import ModuleSelectDialog from "@/components/manual/ModuleSelectDialog";
import ManualMap from "@/components/manual/ManualMap";
import { useLanguage } from "@/components/LanguageProvider";
import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";

const UI_TEXT = {
  en: {
    title: "Vera F&B Ops Manual",
    generate: "Generate Manual",
    generating: "Generating...",
    regenerate: "Regenerate",
    print: "Print",
    exportPdf: "Export PDF",
    exporting: "Exporting...",
    search: "Search modules...",
    noModules: "No modules found",
    selectModule: "Select a module from the sidebar to view its documentation",
    neverGenerated: "The manual has not been generated yet. Generate it now to create comprehensive documentation for all modules in the system.",
    askAdmin: "Ask an administrator to generate the manual.",
    generatingMsg: "AI is analyzing all modules and generating comprehensive documentation. This takes 1-2 minutes.",
    lastUpdated: "Last updated",
    entities: "entities",
    sections: {
      description: "Description",
      benefits: "Benefits & Features",
      strategy: "How to Get Maximum Benefit",
      cautions: "Cautions to Avoid",
      data: "Required Accurate Data",
      guide: "Complete Usage Guide",
      finance: "Finance Integration",
    },
    systemMap: "System map & Finance links",
    mapIntro: "Every module by domain and chapter, with how it connects to Finance today. Click a module to open its chapter.",
    whereToFind: "Where to find it",
    relatedModules: "Related modules",
    previous: "Previous",
    next: "Next",
    progress: (done, total) => `Writing chapters ${done} of ${total}...`,
    screenshotLabel: "App Screenshot",
    regenerated: (n) => `Manual regenerated with ${n} modules!`,
    failed: (e) => `Failed to regenerate: ${e}`,
    pdfSuccess: "PDF exported successfully!",
    pdfFail: (e) => `Failed to export PDF: ${e}`,
    langTooltip: "English / العربية",
  },
  ar: {
    title: "دليل Vera F&B Ops",
    generate: "توليد الدليل",
    generating: "جارٍ التوليد...",
    regenerate: "إعادة التوليد",
    print: "طباعة",
    exportPdf: "تصدير PDF",
    exporting: "جارٍ التصدير...",
    search: "ابحث عن وحدات...",
    noModules: "لا توجد وحدات",
    selectModule: "اختر وحدة من القائمة الجانبية لعرض وثائقها",
    neverGenerated: "لم يتم توليد الدليل بعد. قم بتوليده الآن لإنشاء وثائق شاملة لجميع الوحدات في النظام.",
    askAdmin: "اطلب من المسؤول توليد الدليل.",
    generatingMsg: "يقوم الذكاء الاصطناعي بتحليل جميع الوحدات وإنشاء وثائق شاملة. يستغرق هذا 1-2 دقيقة.",
    lastUpdated: "آخر تحديث",
    entities: "كيانات",
    sections: {
      description: "الوصف",
      benefits: "المزايا والمميزات",
      strategy: "كيف تحصل على أقصى استفادة",
      cautions: "تحذيرات يجب تجنبها",
      data: "البيانات المطلوبة بدقة",
      guide: "دليل الاستخدام الكامل",
      finance: "الربط مع المالية",
    },
    systemMap: "خريطة النظام والربط المالي",
    mapIntro: "كل الوحدات حسب المجال والفصل، مع طريقة ربطها بالمالية اليوم. اضغط على وحدة لفتح فصلها.",
    whereToFind: "مكانها في النظام",
    relatedModules: "وحدات مرتبطة",
    previous: "السابق",
    next: "التالي",
    progress: (done, total) => `جارٍ كتابة الفصول ${done} من ${total}...`,
    screenshotLabel: "لقطة شاشة",
    regenerated: (n) => `تم إعادة توليد الدليل بـ ${n} وحدات!`,
    failed: (e) => `فشل إعادة التوليد: ${e}`,
    pdfSuccess: "تم تصدير PDF بنجاح!",
    pdfFail: (e) => `فشل تصدير PDF: ${e}`,
    langTooltip: "English / العربية",
  },
};

export default function VeraKit360Manual() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <ManualPage />
    </QueryClientProvider>
  );
}

function ManualPage() {
  const [selectedModule, setSelectedModule] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language: appLanguage } = useLanguage();
  const [language, setLanguage] = useState(appLanguage === "ar" ? "ar" : "en");

  // Follow the global app language (RTL Arabic / LTR English)
  useEffect(() => {
    setLanguage(appLanguage === "ar" ? "ar" : "en");
    setSelectedModule(null);
  }, [appLanguage]);
  const [exporting, setExporting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [progress, setProgress] = useState(null);
  const [showCapture, setShowCapture] = useState(false);
  const [showModuleSelect, setShowModuleSelect] = useState(false);
  // null = all modules; the same selection applies to both EN & AR generation
  const [selectedModules, setSelectedModules] = useState(() => {
    try { return JSON.parse(localStorage.getItem("manual_selected_modules")) || null; } catch { return null; }
  });

  const saveModuleSelection = (names) => {
    setSelectedModules(names);
    if (names) localStorage.setItem("manual_selected_modules", JSON.stringify(names));
    else localStorage.removeItem("manual_selected_modules");
  };

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  // Regenerating follows the Settings tabs (as the server does); screenshots follow the Systems tabs.
  const canRegenerate = isAdmin || permissions?.admin_settings === true;
  const canEditScreens = isAdmin || permissions?.admin_systems === true;

  const t = UI_TEXT[language];

  const { data: sections, isLoading, refetch } = useQuery({
    queryKey: ["manualSections", language],
    queryFn: async () => {
      const data = await base44.entities.VeraKit360ManualSection.filter({ language }, "order", 200);
      return data;
    },
  });

  // Auto-select first module on load
  useEffect(() => {
    if (sections && sections.length > 0 && !selectedModule) {
      setSelectedModule(sections[0]);
    }
    if (sections && sections.length > 0 && selectedModule && !sections.find(s => s.id === selectedModule.id)) {
      setSelectedModule(sections[0]);
    }
  }, [sections, selectedModule]);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return sections || [];
    const q = searchQuery.toLowerCase();
    return (sections || []).filter(s =>
      [s.module_name, s.description, s.category, s.domain, s.chapter, s.nav_path]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [sections, searchQuery]);

  const openModule = (m) => {
    setSelectedModule(m);
    setShowMap(false);
    window.scrollTo({ top: 0 });
  };

  // Chapters are written a few at a time so each call finishes well within
  // the server time limit; a full run then removes chapters of retired modules.
  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const fullRun = !selectedModules || selectedModules.length === 0;
      const names = fullRun
        ? (await base44.functions.invoke("generateVeraKit360Manual", { list_modules: true })).data.modules.map((m) => m.name)
        : selectedModules;
      let done = 0;
      const failed = [];
      setProgress({ done, total: names.length });
      for (let i = 0; i < names.length; i += 3) {
        const response = await base44.functions.invoke("generateVeraKit360Manual", { language, selected_modules: names.slice(i, i + 3) });
        if (response.data?.error) failed.push(...names.slice(i, i + 3));
        else failed.push(...(response.data.failed || []));
        done = Math.min(i + 3, names.length);
        setProgress({ done, total: names.length });
        await refetch();
      }
      if (fullRun && failed.length === 0) await base44.functions.invoke("generateVeraKit360Manual", { language, prune: true });
      await refetch();
      if (failed.length) toast.error(t.failed(failed.join(", ")));
      else toast.success(t.regenerated(names.length));
    } catch (error) {
      toast.error(t.failed(error.message || "Unknown error"));
    } finally {
      setRegenerating(false);
      setProgress(null);
    }
  };

  const handleExportPdf = async (includeScreenshots = true) => {
    if (!sections || sections.length === 0) return;
    setExporting(true);
    try {
      await exportManualToPDF(sections, language, t, includeScreenshots);
      toast.success(t.pdfSuccess);
    } catch (error) {
      toast.error(t.pdfFail(error.message || "Unknown error"));
    } finally {
      setExporting(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === "en" ? "ar" : "en");
    setSelectedModule(null);
  };

  const isRTL = language === "ar";

  // Empty state — manual never generated for this language
  if (!isLoading && (!sections || sections.length === 0)) {
    return (
      <div className={`min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-6 ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-md text-center">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t.title}</h1>
          <p className="text-slate-500 mb-6">{t.neverGenerated}</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-1">
              <Languages className="w-4 h-4" />
              {isRTL ? "English" : "العربية"}
            </Button>
          </div>
          {canRegenerate ? (
            <Button onClick={handleRegenerate} disabled={regenerating} className="gap-2 bg-blue-600 hover:bg-blue-700" size="lg">
              {regenerating
                ? <><Loader2 className="w-5 h-5 animate-spin" /> {t.generating} (1-2 min)</>
                : <><RefreshCw className="w-5 h-5" /> {t.generate}</>}
            </Button>
          ) : (
            <p className="text-sm text-slate-400">{t.askAdmin}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-64px)] bg-slate-50 ${isRTL ? "rtl" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-16 z-20 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">{t.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-1">
            <Languages className="w-4 h-4" />
            <span className="hidden sm:inline">{isRTL ? "English" : "العربية"}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting} className="gap-1">
                {exporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> <span className="hidden sm:inline">{t.exporting}</span></>
                  : <><FileDown className="w-4 h-4" /> <span className="hidden sm:inline">{t.exportPdf}</span> <ChevronDown className="w-3 h-3" /></>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExportPdf(true)} className="gap-2">
                <FileImage className="w-4 h-4" />
                <span>{isRTL ? "تصدير مع لقطات الشاشة" : "Export with Screenshots"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPdf(false)} className="gap-2">
                <FileDown className="w-4 h-4" />
                <span>{isRTL ? "تصدير بدون لقطات الشاشة" : "Export without Screenshots"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canEditScreens && (
            <Button variant="outline" size="sm" onClick={() => setShowCapture(true)} className="gap-1">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">{isRTL ? "لقطات" : "Screenshots"}</span>
            </Button>
          )}
          {canRegenerate && (
            <Button variant="outline" size="sm" onClick={() => setShowModuleSelect(true)} className="gap-1">
              <ListChecks className="w-4 h-4" />
              <span className="hidden sm:inline">{isRTL ? "الأقسام" : "Sections"}</span>
              <span className="text-xs font-bold text-blue-600">
                {selectedModules ? selectedModules.length : (isRTL ? "الكل" : "All")}
              </span>
            </Button>
          )}
          {canRegenerate && (
            <Button onClick={handleRegenerate} disabled={regenerating} className="gap-1 bg-blue-600 hover:bg-blue-700" size="sm">
              {regenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> <span className="hidden sm:inline">{t.generating}</span></>
                : <><RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">{t.regenerate}</span></>}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="flex">
          {/* Sidebar — Desktop */}
          <aside className="hidden lg:block w-72 bg-white border-r border-slate-200 sticky top-[112px] h-[calc(100vh-112px)] print:hidden">
            <ManualSidebar
              sections={filteredSections}
              selectedModule={selectedModule}
              onSelect={openModule}
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              onShowMap={() => setShowMap(true)}
              showingMap={showMap}
              t={t}
            />
          </aside>

          {/* Sidebar — Mobile overlay */}
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-40 bg-black/50 print:hidden" onClick={() => setSidebarOpen(false)}>
              <aside className="w-72 bg-white h-full" onClick={e => e.stopPropagation()}>
                <ManualSidebar
                  sections={filteredSections}
                  selectedModule={selectedModule}
                  onSelect={(m) => { openModule(m); setSidebarOpen(false); }}
                  searchQuery={searchQuery}
                  onSearch={setSearchQuery}
                  onShowMap={() => { setShowMap(true); setSidebarOpen(false); }}
                  showingMap={showMap}
                  t={t}
                />
              </aside>
            </div>
          )}

          {/* Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            <div className="max-w-4xl mx-auto">
              {showMap ? (
                <ManualMap sections={sections || []} onSelect={openModule} t={t} language={language} />
              ) : (
                <ManualContent section={selectedModule} sections={sections || []} onSelect={openModule} language={language} t={t} isAdmin={canEditScreens} onRefresh={refetch} />
              )}
            </div>
          </main>
        </div>
      )}

      {showModuleSelect && (
        <ModuleSelectDialog
          isRTL={isRTL}
          initialSelection={selectedModules}
          onSave={saveModuleSelection}
          onClose={() => setShowModuleSelect(false)}
        />
      )}

      {showCapture && (
        <ScreenshotCaptureDialog
          sections={sections || []}
          language={language}
          onClose={() => setShowCapture(false)}
          onComplete={() => refetch()}
        />
      )}

      {/* Regeneration overlay */}
      {regenerating && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center print:hidden">
          <div className="bg-white rounded-xl p-8 text-center max-w-sm mx-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{isRTL ? "توليد الدليل" : "Generating Manual"}</h3>
            <p className="text-sm text-slate-500">{progress ? t.progress(progress.done, progress.total) : t.generatingMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}