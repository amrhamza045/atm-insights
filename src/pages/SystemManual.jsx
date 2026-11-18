import React, { useState } from "react";
import { BookOpen, Printer, Menu, X, ChevronLeft, ChevronRight, Download, Loader2, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SYSTEM_CHAPTERS } from "@/components/manual/system/systemChapters";
import { HOWTO_CHAPTERS } from "@/components/manual/system/howToChapters";
import { UI_FLOWS } from "@/components/manual/system/uiFlows";
import { ADDITIONAL_UI_FLOWS } from "@/components/manual/system/additionalUiFlows";
import UIFlowsTab from "@/components/manual/system/UIFlowsTab";
import SystemManualSidebar from "@/components/manual/system/SystemManualSidebar";
import MarkdownBlocks from "@/components/manual/system/MarkdownBlocks";
import HowToTaskIndex from "@/components/manual/system/HowToTaskIndex";
import useManualBookDownload from "@/components/manual/system/useManualBookDownload";

const FLOW_GROUP_ORDER = ["Catering", "Purchasing", "Inventory", "POS & Cashier", "Delivery", "CRM & Loyalty"];
const ALL_UI_FLOWS = [...UI_FLOWS, ...ADDITIONAL_UI_FLOWS].sort((a, b) => FLOW_GROUP_ORDER.indexOf(a.group) - FLOW_GROUP_ORDER.indexOf(b.group));

export default function SystemManual() {
  const params = new URLSearchParams(window.location.search);
  const requestedMode = params.get("mode");
  const initialMode = ["reference", "howto", "flows"].includes(requestedMode) ? requestedMode : "reference";
  const [mode, setMode] = useState(initialMode);
  const chapters = mode === "howto" ? HOWTO_CHAPTERS : mode === "flows" ? ALL_UI_FLOWS : SYSTEM_CHAPTERS;

  const requested = params.get("chapter");
  const [activeKeys, setActiveKeys] = useState({
    reference: SYSTEM_CHAPTERS.some((c) => c.key === requested) ? requested : SYSTEM_CHAPTERS[0].key,
    howto: HOWTO_CHAPTERS.some((c) => c.key === requested) ? requested : HOWTO_CHAPTERS[0].key,
    flows: ALL_UI_FLOWS.some((c) => c.key === requested) ? requested : ALL_UI_FLOWS[0].key,
  });
  const activeKey = activeKeys[mode];
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [printAll, setPrintAll] = useState(false);
  const { download, busy } = useManualBookDownload();

  const index = chapters.findIndex((c) => c.key === activeKey);
  const chapter = chapters[index] || chapters[0];
  const prev = chapters[index - 1];
  const next = chapters[index + 1];

  const select = (key) => {
    setActiveKeys((k) => ({ ...k, [mode]: key }));
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  const jumpToFlow = (key) => {
    if (!ALL_UI_FLOWS.some((flow) => flow.key === key)) return;
    setActiveKeys((current) => ({ ...current, flows: key }));
    setMode("flows");
    setQuery("");
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const switchMode = (next) => {
    setMode(next);
    setQuery("");
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  const openTask = (task) => {
    setActiveKeys((k) => ({ ...k, howto: task.chapter }));
    setTimeout(() => {
      const el = document.getElementById(task.anchor);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo(0, 0);
    }, 60);
  };

  const handlePrint = (all) => {
    setPrintAll(all);
    setTimeout(() => { window.print(); setPrintAll(false); }, 150);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-16 z-20 print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <BookOpen className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 leading-tight">User Manual</h1>
            <p className="text-xs text-slate-500 hidden sm:block truncate">
              {mode === "howto" ? "Step-by-step guides for everyday tasks" : mode === "flows" ? "Interactive journeys through core operations" : "Role-based documentation for the whole system"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            <button
              onClick={() => switchMode("reference")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === "reference" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              Reference
            </button>
            <button
              onClick={() => switchMode("howto")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === "howto" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              How-To
            </button>
            <button
              onClick={() => switchMode("flows")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === "flows" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              UI Flows
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => handlePrint(false)} className="gap-1.5"><Printer className="w-4 h-4" /><span className="hidden xl:inline">Print {mode === "flows" ? "flow" : "chapter"}</span></Button>
          {mode !== "flows" && <Button variant="outline" size="sm" onClick={() => handlePrint(true)} className="gap-1.5"><Printer className="w-4 h-4" /><span className="hidden xl:inline">Print {mode === "howto" ? "How-To" : "Reference"}</span></Button>}
          {mode !== "flows" && <Button
            size="sm"
            onClick={() => download(mode === "howto" ? "howto" : "reference")}
            disabled={!!busy}
            className="gap-1.5 bg-amber-600 hover:bg-amber-700"
          >
            {busy === "howto" || busy === "reference" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">{mode === "howto" ? "How-To" : "Reference"} PDF</span>
          </Button>}
          {mode !== "flows" && <Button
            variant="outline"
            size="sm"
            onClick={() => download("all")}
            disabled={!!busy}
            className="gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50"
          >
            {busy === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Library className="w-4 h-4" />}
            <span className="hidden lg:inline">Complete book</span>
          </Button>}
        </div>
      </div>

      <div className="flex">
        <aside className="hidden lg:block w-72 bg-white border-r border-slate-200 sticky top-[124px] h-[calc(100vh-124px)] print:hidden">
          <SystemManualSidebar chapters={chapters} activeKey={activeKey} onSelect={select} query={query} onQuery={setQuery} />
        </aside>
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50 print:hidden" onClick={() => setSidebarOpen(false)}>
            <aside className="w-72 bg-white h-full" onClick={(e) => e.stopPropagation()}>
              <SystemManualSidebar chapters={chapters} activeKey={activeKey} onSelect={select} query={query} onQuery={setQuery} />
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-10">
          <div className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-10 print:border-0 print:shadow-none print:p-0">
            {mode === "howto" && <HowToTaskIndex onOpenTask={openTask} />}

            {mode === "flows"
              ? <UIFlowsTab key={chapter.key} flow={chapter} onJumpToFlow={jumpToFlow} />
              : printAll
                ? chapters.map((c) => <div key={c.key} className="print:break-before-page first:print:break-before-auto"><MarkdownBlocks markdown={c.content} /></div>)
                : <MarkdownBlocks markdown={chapter.content} />}

            {!printAll && (
              <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between gap-3 print:hidden">
                {prev ? <Button variant="outline" onClick={() => select(prev.key)} className="gap-1.5"><ChevronLeft className="w-4 h-4" /> {prev.number}. {prev.title}</Button> : <span />}
                {next ? <Button variant="outline" onClick={() => select(next.key)} className="gap-1.5">{next.number}. {next.title} <ChevronRight className="w-4 h-4" /></Button> : <span />}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}