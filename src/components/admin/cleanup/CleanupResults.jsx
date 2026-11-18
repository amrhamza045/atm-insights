import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { splitWords } from "./cleanupTables";

export default function CleanupResults({ results }) {
  const failed = results.filter((r) => !r.success);
  const deleted = results.reduce((s, r) => s + (r.deleted || 0), 0);
  return (
    <Card className={`border-0 shadow-lg mb-6 ${failed.length ? "bg-amber-50" : "bg-green-50"}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 text-base ${failed.length ? "text-amber-900" : "text-green-900"}`}>
          {failed.length ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {deleted.toLocaleString()} records deleted{failed.length ? ` · ${failed.length} table(s) incomplete` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-64 overflow-y-auto space-y-1">
        {results.map((r) => (
          <div key={r.table} className="flex justify-between text-sm">
            <span className="font-medium text-slate-800">{splitWords(r.table)}</span>
            <span className={r.success ? "text-green-700" : "text-red-600"}>
              {r.error ? r.error : `${r.deleted} / ${r.before ?? "?"} deleted${r.remaining ? ` · ${r.remaining} left` : ""}`}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}