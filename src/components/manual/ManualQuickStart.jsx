import { motion } from "framer-motion";
import { Rocket } from "lucide-react";

export default function ManualQuickStart() {
  const steps = [
    "Navigate to the Upload Logs page from the navigation bar.",
    "Drag and drop your Excel maintenance file (.xlsx, .xls, or .csv) or click to browse.",
    "Click 'Upload & Analyze' — the AI will extract all rows automatically.",
    "Once successful, a confirmation shows how many logs were imported.",
    "Head to the Dashboard to view analytics, trends, and terminal rankings.",
    "Use the upload batch filter to compare different time periods.",
    "Go to Transaction Logs to search, filter, and export specific records to CSV.",
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <Rocket className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Quick Start Guide</h3>
          <p className="text-amber-100 text-sm">Get up and running in minutes</p>
        </div>
      </div>

      <div className="p-8">
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="w-8 h-8 bg-amber-100 text-amber-700 font-bold rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                {i + 1}
              </span>
              <p className="text-sm text-slate-700 leading-relaxed pt-1">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </motion.section>
  );
}