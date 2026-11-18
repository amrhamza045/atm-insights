import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Pencil, Lock, ShieldAlert, Layers, Info } from "lucide-react";

const SCOPE_BADGE_STYLES = {
  shared: "bg-blue-50 text-blue-700 border-blue-200",
  branch_company: "bg-emerald-50 text-emerald-700 border-emerald-200",
  user_preference: "bg-purple-50 text-purple-700 border-purple-200",
  access_security: "bg-amber-50 text-amber-800 border-amber-300",
};

export default function CatalogCard({ item, allowed, onEdit }) {
  const isSecurity = item.scope === "access_security";

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 transition-shadow ${
        !allowed
          ? "bg-slate-50/80 border-slate-200 opacity-80"
          : isSecurity
          ? "bg-amber-50/20 border-amber-200/80 hover:shadow-sm"
          : "bg-card hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                SCOPE_BADGE_STYLES[item.scope] || "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {isSecurity ? <ShieldAlert className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
              {item.scopeLabel}
            </span>
            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
              {item.category}
            </span>
          </div>
          <p className="font-semibold text-slate-900 leading-snug pt-0.5">{item.title}</p>
        </div>
        <Badge
          variant={!allowed ? "outline" : item.editor ? "default" : "secondary"}
          className="whitespace-nowrap text-[10px] flex-shrink-0"
        >
          {!allowed ? "Restricted" : item.editor ? "Quick edit" : "Full settings"}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground flex-1 leading-relaxed">{item.desc}</p>

      {item.impact && (
        <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-2 text-[11px] text-slate-600 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
          <span><strong className="font-medium text-slate-700">Impact:</strong> {item.impact}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <span className={`text-[11px] flex items-center gap-1 ${allowed ? "text-slate-500" : "text-amber-700 font-medium"}`}>
          {!allowed && <Lock className="w-3 h-3 flex-shrink-0" />}
          {item.permissionLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {allowed ? (
          <>
            {item.editor && (
              <Button size="sm" onClick={() => onEdit(item)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                Quick edit
              </Button>
            )}
            <Button size="sm" variant={item.editor ? "outline" : "default"} asChild className="gap-1.5">
              <Link to={item.to}>
                {item.openLabel || "Open settings"}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" disabled className="gap-1.5 w-full">
            <Lock className="w-3.5 h-3.5" />
            Permission required
          </Button>
        )}
      </div>
    </div>
  );
}