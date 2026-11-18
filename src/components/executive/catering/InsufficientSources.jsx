import { AlertTriangle } from "lucide-react";

const SOURCE_LABELS = {
  slips: "No Kitchen Release Slip records", attendance: "No Attendance records",
  assignments: "No Catering Assignment records", shifts: "No Shift records",
  invoices: "No Purchase Invoice records", equipmentReservations: "No equipment reservation records",
};

export default function InsufficientSources({ run }) {
  const counts = run?.source_counts || {};
  const missing = Object.entries(SOURCE_LABELS).filter(([key]) => !Number(counts[key])).map(([, label]) => label);
  const warnings = run?.warning_codes || [];
  return (
    <div className="rounded-xl border border-warning-200 bg-warning-50 p-5">
      <h3 className="flex items-center gap-2 font-bold text-warning-900"><AlertTriangle className="w-5 h-5" /> Sources needed before analysis</h3>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-warning-900">
        {missing.map((label) => <li key={label}>{label}</li>)}
        {warnings.map((warning) => <li key={warning}>Warning: {warning.replaceAll("_", " ")}</li>)}
      </ul>
      {!missing.length && !warnings.length && <p className="mt-2 text-sm text-warning-800">Recompute actual costs to refresh source diagnostics.</p>}
    </div>
  );
}