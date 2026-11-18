import ReactMarkdown from "react-markdown";
import { Info, Sparkles, TrendingUp, AlertTriangle, Database, BookOpen, ImageIcon, Upload, Loader2, Trash2, Landmark } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import ManualModuleHeader from "@/components/manual/ManualModuleHeader";
import ManualPager from "@/components/manual/ManualPager";

const getSections = (t) => [
  { key: "description", title: t?.sections?.description || "Description", icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "benefits_and_features", title: t?.sections?.benefits || "Benefits & Features", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { key: "max_benefit_strategy", title: t?.sections?.strategy || "How to Get Maximum Benefit", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  { key: "cautions", title: t?.sections?.cautions || "Cautions to Avoid", icon: AlertTriangle, color: "text-warning-600", bg: "bg-warning-50", border: "border-warning-200" },
  { key: "required_accurate_data", title: t?.sections?.data || "Required Accurate Data", icon: Database, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
  { key: "usage_guide", title: t?.sections?.guide || "Complete Usage Guide", icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  { key: "finance_integration", title: t?.sections?.finance || "Finance Integration", icon: Landmark, color: "text-success-700", bg: "bg-success-50", border: "border-success-200" },
];

const mdComponents = {
  h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-slate-800 mt-4 mb-2" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-base font-medium text-slate-700 mt-3 mb-1" {...props} />,
  p: ({node, ...props}) => <p className="text-sm text-slate-600 mb-2 leading-relaxed" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc list-inside text-sm text-slate-600 mb-2 space-y-1" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal list-inside text-sm text-slate-600 mb-2 space-y-1" {...props} />,
  li: ({node, ...props}) => <li className="text-sm text-slate-600" {...props} />,
  strong: ({node, ...props}) => <strong className="font-semibold text-slate-800" {...props} />,
};

function ScreenshotSection({ section, t, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const urls = section.screenshot_urls || [];

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.VeraKit360ManualSection.update(section.id, {
        screenshot_urls: [...urls, file_url],
      });
      onRefresh?.();
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (idx) => {
    const newUrls = urls.filter((_, i) => i !== idx);
    await base44.entities.VeraKit360ManualSection.update(section.id, {
      screenshot_urls: newUrls,
    });
    onRefresh?.();
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3 text-slate-700">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          <h2 className="text-lg font-semibold">{t?.screenshotLabel || "App Screenshot"}</h2>
        </div>
        <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 ${uploading ? "pointer-events-none opacity-50" : ""}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{uploading ? "Uploading..." : "Upload Screenshot"}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {urls.length > 0 ? (
        <div className="space-y-3">
          {urls.map((url, idx) => (
            <div key={idx} className="rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group">
              <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full" />
              <button
                onClick={() => handleDelete(idx)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete screenshot"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No screenshot yet. Navigate to this section in the app, take a screenshot, and upload it.</p>
        </div>
      )}
    </div>
  );
}

export default function ManualContent({ section, sections: allSections = [], onSelect, language, t, isAdmin, onRefresh }) {
  if (!section) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-slate-400 text-lg">{t?.selectModule || "Select a module from the sidebar to view its documentation"}</p>
      </div>
    );
  }

  const sections = getSections(t);

  return (
    <div className="space-y-6">
      <ManualModuleHeader
        section={section}
        t={t}
        language={language}
        onOpenModule={(name) => {
          const target = allSections.find((s) => s.module_name === name);
          if (target) onSelect?.(target);
        }}
      />

      {(isAdmin || section.screenshot_urls?.length > 0) && (
        <ScreenshotSection section={section} t={t} onRefresh={onRefresh} />
      )}

      {sections.filter(({ key }) => key !== "finance_integration" || section[key]).map(({ key, title, icon: Icon, color, bg, border }) => (
        <div key={key} className={`rounded-lg border ${border} ${bg} p-5`}>
          <div className={`flex items-center gap-2 mb-3 ${color}`}>
            <Icon className="w-5 h-5" />
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <div className="text-slate-700">
            <ReactMarkdown components={mdComponents}>
              {section[key] || 'No information available.'}
            </ReactMarkdown>
          </div>
        </div>
      ))}

      {onSelect && <ManualPager sections={allSections} current={section} onSelect={onSelect} t={t} />}
    </div>
  );
}