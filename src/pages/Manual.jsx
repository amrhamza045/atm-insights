import { motion } from "framer-motion";
import { LayoutDashboard, Upload as UploadIcon, FileText } from "lucide-react";
import ManualIntro from "../components/manual/ManualIntro";
import ManualFeature from "../components/manual/ManualFeature";
import ManualAISection from "../components/manual/ManualAISection";
import ManualBusinessValue from "../components/manual/ManualBusinessValue";
import ManualQuickStart from "../components/manual/ManualQuickStart";

export default function Manual() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <ManualIntro />

        {/* Quick Start */}
        <ManualQuickStart />

        {/* Feature 1: Dashboard */}
        <ManualFeature
          index={0}
          icon={LayoutDashboard}
          title="Dashboard — Real-Time Analytics"
          subtitle="A live operational overview of all ATM maintenance activity"
          accent="indigo"
          sections={[
            {
              heading: "What it shows",
              body: "The dashboard is the landing page of the application. It presents key metrics at a glance: total issues logged, resolved rate percentage, number of active (unique) terminals, and pending (unresolved) issues.",
            },
            {
              heading: "Upload Batch Filter",
              body: "When multiple Excel files have been uploaded over time, a batch selector appears at the top. Each upload is stamped with a timestamp. You can filter the entire dashboard to a specific upload batch or view all data combined — making it easy to compare maintenance periods.",
            },
            {
              heading: "Stats Cards",
              body: "Four summary cards display: Total Issues (all recorded maintenance events), Resolved Rate (percentage of logs with a 'Solved By' entry), Active Terminals (count of unique terminal IDs), and Pending Issues (logs awaiting resolution).",
            },
            {
              heading: "Issue Trend Chart",
              body: "An area chart visualizes issue counts over the last 7 days based on the 'Starting From' date of each log, helping you spot spikes or improvements in maintenance activity over time.",
            },
            {
              heading: "Fault Type Breakdown",
              body: "A donut chart shows the distribution of issues by fault type — quickly revealing which fault categories are most common so teams can focus preventive efforts.",
            },
            {
              heading: "Top ATMs Table",
              body: "A ranked table lists terminals by issue count, showing each terminal's ID, branch location, and total recorded issues. This helps identify problematic ATMs that may need replacement or escalated service.",
            },
          ]}
        />

        {/* Feature 2: Upload Logs */}
        <ManualFeature
          index={1}
          icon={UploadIcon}
          title="Upload Logs — Excel Import & AI Extraction"
          subtitle="Import maintenance data from spreadsheets with zero manual data entry"
          accent="emerald"
          sections={[
            {
              heading: "How it works",
              body: "The Upload Logs page accepts Excel files (.xlsx, .xls) and CSV files. Simply drag and drop a file or click to browse. Once a file is selected, click 'Upload & Analyze' to begin processing.",
            },
            {
              heading: "AI-powered extraction",
              body: "Instead of requiring rigid column formats, the application sends the uploaded file to an AI model that reads the spreadsheet content, identifies the relevant columns, and maps each row to a standardized 14-field data schema. This means your Excel files don't need to follow an exact template — the AI adapts to your data.",
            },
            {
              heading: "Supported columns",
              body: "The extraction schema covers all standard ATM maintenance log fields:",
              items: [
                "Terminal ID — unique ATM identifier",
                "Module Name — the affected component/module",
                "Event — the event that occurred",
                "Fault Type — category of the fault",
                "Branch — bank branch location",
                "Vendor — service provider/vendor",
                "Type — log entry type",
                "Rule — applicable rule",
                "Last Processing Step — current status",
                "Starting From — when the issue began",
                "Ending At — when it was resolved",
                "Duration — total downtime duration",
                "Solved By — technician who resolved it",
                "Maintenance Remark — free-text notes",
              ],
            },
            {
              heading: "Batch tracking",
              body: "Every upload is tagged with a timestamp-based batch ID. This allows you to distinguish data from different uploads and filter the dashboard to analyze a specific batch or compare across batches.",
            },
            {
              heading: "File validation",
              body: "Files are limited to 10MB maximum. If a file exceeds this limit or if no data can be extracted, a clear error message is displayed with technical details available for troubleshooting.",
            },
          ]}
        />

        {/* Feature 3: Transaction Logs */}
        <ManualFeature
          index={2}
          icon={FileText}
          title="Transaction Logs — Search, Filter & Export"
          subtitle="Browse, search, and export individual maintenance log records"
          accent="amber"
          sections={[
            {
              heading: "Full log listing",
              body: "The Transaction Logs page displays all imported maintenance records in a paginated table, showing the most recent logs first. Each row displays terminal ID, branch, module, event, fault type, timestamps, duration, solver, and remarks.",
            },
            {
              heading: "Search",
              body: "A free-text search bar filters logs in real time by terminal ID, branch, module name, or event — helping you quickly locate a specific ATM or incident.",
            },
            {
              heading: "Filters",
              body: "Two dropdown filters allow narrowing results by branch and fault type. These filters combine with the search to drill down to exactly the records you need.",
            },
            {
              heading: "CSV Export",
              body: "After filtering to the desired set of logs, click 'Export to CSV' to download a spreadsheet with all visible records. The export includes terminal ID, branch, module, event, fault type, start time, duration, solver, and remarks — ready for offline analysis or regulatory reporting.",
            },
          ]}
        />

        {/* AI Section */}
        <ManualAISection />

        {/* Business Value */}
        <ManualBusinessValue />

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center py-8"
        >
          <p className="text-sm text-slate-400">
            ATM Tracker — Comprehensive Maintenance Analytics Platform
          </p>
          <p className="text-xs text-slate-400 mt-1">
            For support, contact your system administrator
          </p>
        </motion.div>
      </div>
    </div>
  );
}