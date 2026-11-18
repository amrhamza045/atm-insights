import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Trash2, UtensilsCrossed } from "lucide-react";
import { severityFor, daysLabel, affectedMenuItems } from "./expiryMeta";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function ExpiryReportRow({ report, menuItems, canEdit, onResolve }) {
  const sev = severityFor(report.expiry_date);
  const affected = affectedMenuItems(menuItems, report.inventory_item_id);

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">{report.inventory_item_name}</span>
            <Badge variant="outline" className={sev.classes}>{sev.label}</Badge>
            {report.status !== "open" && (
              <Badge variant="secondary">{report.status === "used" ? "Used" : "Wasted"}</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {report.category_name && `${report.category_name} · `}
            Expires {report.expiry_date} · {daysLabel(sev.days)}
            {report.batch_ref && ` · Batch ${report.batch_ref}`}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {report.quantity_at_risk} {report.unit} at risk
            {report.estimated_value > 0 && ` · ${formatCurrency(report.estimated_value)}`}
            {report.branch_name && ` · ${report.branch_name}`}
          </p>
          {report.notes && <p className="text-xs text-slate-500 mt-1 italic">{report.notes}</p>}
          {affected.length > 0 && (
            <p className="text-xs text-blue-700 mt-1 flex items-start gap-1">
              <UtensilsCrossed className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Used in: {affected.slice(0, 5).map((m) => m.name).join(", ")}{affected.length > 5 ? ` +${affected.length - 5} more` : ""}</span>
            </p>
          )}
          {report.photo_url && (
            <a href={report.photo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 inline-block">
              View photo
            </a>
          )}
        </div>

        {canEdit && report.status === "open" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => onResolve(report, "used")}>
              <Check className="w-3 h-3" /> Used
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-red-600" onClick={() => onResolve(report, "wasted")}>
              <Trash2 className="w-3 h-3" /> Wasted
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}