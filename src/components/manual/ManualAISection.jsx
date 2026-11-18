import { motion } from "framer-motion";
import { Brain, FileSpreadsheet, Database, BarChart3, Sparkles } from "lucide-react";

export default function ManualAISection() {
  const steps = [
    {
      icon: FileSpreadsheet,
      title: "Step 1 — File Upload",
      text: "The user uploads an Excel (.xlsx, .xls) or CSV file via the Upload Logs page. The file is securely stored and a URL is generated.",
    },
    {
      icon: Brain,
      title: "Step 2 — AI Extraction",
      text: "The AI model analyzes the spreadsheet content, identifies column headers, and maps each row to a structured data schema with 14 fields including terminal ID, fault type, duration, and maintenance remarks.",
    },
    {
      icon: Database,
      title: "Step 3 — Data Storage",
      text: "Extracted logs are bulk-inserted into the database with a unique upload batch ID (timestamp), enabling batch-level filtering and historical tracking across multiple uploads.",
    },
    {
      icon: BarChart3,
      title: "Step 4 — Visualization",
      text: "The dashboard instantly reflects the newly imported data — updating stats cards, trend charts, fault breakdowns, and terminal rankings in real time.",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">AI-Powered Data Extraction</h3>
          <p className="text-purple-100 text-sm">How artificial intelligence automates the entire data pipeline</p>
        </div>
      </div>

      <div className="p-8">
        <div className="flex items-start gap-3 mb-8 bg-purple-50 rounded-xl p-4 border border-purple-100">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700 leading-relaxed">
            Traditional ATM log management requires manual data entry or custom scripts for each
            spreadsheet format. The ATM Tracker uses a Large Language Model (LLM) to intelligently
            read any Excel file, understand its structure regardless of column order or naming
            variations, and automatically map the data into a standardized schema — eliminating
            manual data entry entirely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex gap-4 bg-slate-50 rounded-xl p-5 border border-slate-100">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-1">{step.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
          <h4 className="font-bold text-slate-900 mb-3">Key AI Capabilities</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Format-agnostic: reads any Excel structure without pre-configured templates",
              "Field mapping: intelligently matches columns to the standardized schema",
              "Data normalization: converts all values to consistent string formats",
              "Bulk processing: handles hundreds of rows in a single extraction pass",
              "Batch tracking: every upload is timestamped for historical comparison",
              "Validation: returns structured JSON ensuring data integrity on import",
            ].map((cap, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                {cap}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}