import { useState, useEffect } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { KEEP_TABLES, ACCESS_TABLES, splitWords } from "./cleanupTables";

export default function CleanupReviewDialog({ open, onOpenChange, rows, onConfirm }) {
  const [typed, setTyped] = useState("");
  useEffect(() => { if (!open) setTyped(""); }, [open]);

  const total = rows.reduce((s, r) => s + (r.count || 0), 0);
  const settings = rows.filter((r) => KEEP_TABLES.has(r.table));
  const access = rows.filter((r) => ACCESS_TABLES.has(r.table));

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Review cleanup</AlertDialogTitle>
          <AlertDialogDescription>
            {total.toLocaleString()} record(s) will be deleted from {rows.length} table(s).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
          {rows.map((r) => (
            <div key={r.table} className="flex justify-between px-3 py-1.5 text-sm">
              <span>{splitWords(r.table)}</span>
              <span className="tabular-nums text-slate-600">{(r.count || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
        {settings.length > 0 && (
          <p className="text-xs rounded bg-amber-50 border border-amber-200 text-amber-800 p-2">
            Includes {settings.length} settings/configuration table(s): {settings.map((r) => splitWords(r.table)).join(", ")}. These will not be preserved.
          </p>
        )}
        {access.length > 0 && (
          <p className="text-xs rounded bg-purple-50 border border-purple-200 text-purple-800 p-2">
            Includes access tables ({access.map((r) => splitWords(r.table)).join(", ")}). Staff and clients may lose access until re-created. App user accounts themselves are not deleted.
          </p>
        )}
        <div className="space-y-1">
          <p className="text-xs text-slate-600">Type <span className="font-bold">DELETE</span> to confirm. Deleted records stay recoverable for 30 days from Dashboard → Data → Recently deleted.</p>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={typed !== "DELETE"} onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            Delete {total.toLocaleString()} records
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}