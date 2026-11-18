import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { resyncAfterBulk } from "@/lib/permissionResync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2, AlertTriangle, Rocket, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import CleanupTableRow from "@/components/admin/cleanup/CleanupTableRow";
import CleanupReviewDialog from "@/components/admin/cleanup/CleanupReviewDialog";
import CleanupResults from "@/components/admin/cleanup/CleanupResults";
import { KEEP_TABLES, splitWords } from "@/components/admin/cleanup/cleanupTables";

export default function GoLiveCleanup() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["goLiveCleanupCounts"],
    queryFn: async () => (await base44.functions.invoke("goLiveCleanup", { action: "counts" })).data.tables,
    staleTime: 0,
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => !q || splitWords(r.table).toLowerCase().includes(q) || r.table.toLowerCase().includes(q));
  }, [rows, search]);

  const selectedRows = rows.filter((r) => selected.has(r.table));
  const selectedTotal = selectedRows.reduce((s, r) => s + (r.count || 0), 0);
  const running = !!progress;

  const toggle = (t) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(t) ? next.delete(t) : next.add(t);
    return next;
  });
  const selectWhere = (fn) => setSelected(new Set(rows.filter(fn).map((r) => r.table)));

  const runCleanup = async () => {
    setReviewOpen(false);
    setResults(null);
    const tables = selectedRows.map((r) => r.table);
    const out = [];
    for (let i = 0; i < tables.length; i++) {
      setProgress({ done: i, total: tables.length, current: tables[i] });
      const res = await base44.functions
        .invoke("goLiveCleanup", { action: "clear", table: tables[i] })
        .then((r) => r.data)
        .catch((e) => ({ table: tables[i], deleted: 0, success: false, error: e?.response?.data?.error || e.message }));
      out.push(res);
    }
    setProgress(null);
    setResults(out);
    setSelected(new Set());
    await resyncAfterBulk(tables).catch(() => null);
    queryClient.invalidateQueries();
    refetch();
    const failed = out.filter((r) => !r.success).length;
    failed ? toast.warning(`${failed} table(s) were not fully cleared`) : toast.success("Cleanup complete");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-600 rounded-xl"><Rocket className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Go Live Cleanup</h1>
            <p className="text-slate-600">Clear test data from any table before launching</p>
          </div>
        </div>

        <Card className="border-0 shadow-lg mb-6 bg-amber-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Only the tables you select are deleted. Tables tagged <b>Settings</b> hold configuration, catalog and setup data, and
              <b> Access</b> tables control who can sign in to what — they are only removed if you select them. App user accounts are never deleted.
            </p>
          </CardContent>
        </Card>

        {results && <CleanupResults results={results} />}

        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>All tables ({rows.length})</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={running} onClick={() => selectWhere((r) => r.count > 0 && !KEEP_TABLES.has(r.table))}>Select test data</Button>
                <Button variant="outline" size="sm" disabled={running} onClick={() => selectWhere((r) => r.count > 0)}>Select all with records</Button>
                <Button variant="outline" size="sm" disabled={running} onClick={() => setSelected(new Set())}>Clear selection</Button>
                <Button variant="ghost" size="sm" disabled={isFetching || running} onClick={() => refetch()}>
                  <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tables" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mr-2" />Counting records…</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {visible.map((r) => (
                  <CleanupTableRow key={r.table} row={r} checked={selected.has(r.table)} onToggle={toggle} disabled={running} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="sticky bottom-20 md:bottom-4 mt-6 flex items-center justify-between gap-3 bg-white rounded-xl shadow-lg p-4">
          <p className="text-sm text-slate-700">
            {running
              ? `Clearing ${splitWords(progress.current)} (${progress.done + 1} of ${progress.total})…`
              : `${selected.size} table(s) · ${selectedTotal.toLocaleString()} record(s) selected`}
          </p>
          <Button variant="destructive" disabled={!selected.size || running} onClick={() => setReviewOpen(true)}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Review & clean up
          </Button>
        </div>
      </div>

      <CleanupReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} rows={selectedRows} onConfirm={runCleanup} />
    </div>
  );
}