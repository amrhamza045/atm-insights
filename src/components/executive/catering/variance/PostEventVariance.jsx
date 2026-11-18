import { AlertTriangle } from "lucide-react";
import { buildVarianceRows } from "./varianceLogic";
import VarianceTable from "./VarianceTable";

// Read-only: expected cost vs the actual cost imported from the latest cost run.
export default function PostEventVariance({ event, run, quote }) {
  const rows = buildVarianceRows({ event, run, quote, exceptions: [] });
  const warnings = run?.warning_codes || event.actual_cost_warning_codes || [];
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Post-event cost variance</h3>
      {warnings.length > 0 && (
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Imported actuals are incomplete: {warnings.join(", ").replace(/_/g, " ")}. Totals may be understated.</span>
        </div>
      )}
      <VarianceTable rows={rows} />
      {run?.calculated_at && <p className="text-xs text-slate-400">Imported from cost run of {run.calculated_at.slice(0, 16).replace("T", " ")} ({run.version}).</p>}
    </div>
  );
}