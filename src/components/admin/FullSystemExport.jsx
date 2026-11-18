import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, ShieldCheck, Database, FileArchive, FileSpreadsheet, FolderArchive, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { companyToday } from '@/components/utils/timezoneHelper';

export default function FullSystemExport() {
  const [loading, setLoading] = useState(false);
  const [includeEmpty, setIncludeEmpty] = useState(true);
  const [selectedFolders, setSelectedFolders] = useState(null); // null = all selected
  const [results, setResults] = useState(null);

  const { data: catalog, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['fullSystemExportCatalog'],
    queryFn: async () => {
      const res = await base44.functions.invoke('exportFullSystemData', { action: 'catalog' });
      return res.data;
    },
    staleTime: 60_000,
  });

  const modules = catalog?.modules || [];
  const activeFolders = selectedFolders ?? new Set(modules.map((m) => m.folder));
  const selectedEntities = modules
    .filter((m) => activeFolders.has(m.folder))
    .flatMap((m) => m.entities);

  const toggleFolder = (folder) => {
    const next = new Set(activeFolders);
    if (next.has(folder)) next.delete(folder);
    else next.add(folder);
    setSelectedFolders(next);
  };

  const selectAll = () => setSelectedFolders(new Set(modules.map((m) => m.folder)));
  const deselectAll = () => setSelectedFolders(new Set());

  const previewDate = companyToday();
  const previewZipName = `${catalog?.appName || 'Application'} - ${previewDate}.zip`;

  const handleExport = async () => {
    if (selectedEntities.length === 0) {
      toast.error('Select at least one module to export');
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const exportDate = companyToday();
      const response = await base44.functions.invoke('exportFullSystemData', {
        targetEntities: selectedEntities,
        includeEmpty,
        exportDate,
      });
      const data = response.data;

      if (data?.error) throw new Error(data.error);
      if (!data?.success || !data?.zipData) throw new Error('Invalid export archive response');

      const binary = atob(data.zipData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/zip' });

      const fileName = data.fileName || `${catalog?.appName || 'Application'} - ${exportDate}.zip`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setResults({
        fileName,
        modulesExported: data.modulesExported,
        ...data.summary,
      });
      toast.success(`Downloaded "${fileName}"`);
    } catch (error) {
      toast.error('Export failed: ' + (error?.response?.data?.error || error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <FolderArchive className="w-5 h-5 text-emerald-600" />
                System Data CSV Export (ZIP)
              </CardTitle>
              <CardDescription className="mt-1">
                Export all system data across every module and functionality into separate UTF-8 CSV files bundled in one ZIP archive.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 bg-slate-50">
              <FileArchive className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              {previewZipName}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-start gap-3 p-3.5 bg-emerald-50/70 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-emerald-800">
              100% read-only operation. Each module is organized into its own folder inside the ZIP with separate CSV files per functionality, plus an <strong>00 - Export Summary.csv</strong> manifest.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-900">
                  Modules &amp; Functionalities
                </span>
                <Badge variant="secondary" className="text-xs">
                  {activeFolders.size} / {modules.length} modules · {selectedEntities.length} CSV files
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={selectAll} disabled={loading || isLoadingCatalog}>
                  Select All
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAll} disabled={loading || isLoadingCatalog}>
                  Deselect All
                </Button>
              </div>
            </div>

            {isLoadingCatalog ? (
              <div className="flex items-center gap-2 p-6 text-sm text-slate-500 justify-center border rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading module catalog...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {modules.map((mod) => {
                  const checked = activeFolders.has(mod.folder);
                  return (
                    <label
                      key={mod.folder}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                        checked ? 'bg-white border-emerald-300' : 'bg-slate-50/60 border-slate-200 opacity-75'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleFolder(mod.folder)}
                        disabled={loading}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900 truncate">{mod.folder}</p>
                          <span className="text-[11px] font-medium text-slate-500 flex-shrink-0">
                            {mod.entities.length} CSV{mod.entities.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5" title={mod.entities.join(', ')}>
                          {mod.entities.join(', ')}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <Checkbox
                checked={includeEmpty}
                onCheckedChange={(v) => setIncludeEmpty(v === true)}
                disabled={loading}
              />
              <span>Include header-only CSV files for empty functionalities (0 records)</span>
            </label>
          </div>

          {results && (
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-900">
                  Export Complete — {results.fileName}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 bg-white rounded border border-emerald-100">
                  <p className="text-xs text-slate-500">Modules</p>
                  <p className="text-base font-bold text-slate-900">{results.modulesExported}</p>
                </div>
                <div className="p-2.5 bg-white rounded border border-emerald-100">
                  <p className="text-xs text-slate-500">Populated CSVs</p>
                  <p className="text-base font-bold text-slate-900">{results.exported}</p>
                </div>
                <div className="p-2.5 bg-white rounded border border-emerald-100">
                  <p className="text-xs text-slate-500">Empty Tables</p>
                  <p className="text-base font-bold text-slate-900">{results.empty}</p>
                </div>
                <div className="p-2.5 bg-white rounded border border-emerald-100">
                  <p className="text-xs text-slate-500">Total Records</p>
                  <p className="text-base font-bold text-slate-900">{results.totalRecords?.toLocaleString()}</p>
                </div>
              </div>
              {results.failed?.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    {results.failed.length} table(s) reported errors:
                  </p>
                  {results.failed.map((f) => (
                    <p key={f.entity}>{f.entity}: {f.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-slate-50/70 border-t flex items-center justify-between flex-wrap gap-3 pt-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            <span>Archive filename: <strong className="text-slate-700">{previewZipName}</strong></span>
          </div>
          <Button
            onClick={handleExport}
            disabled={loading || isLoadingCatalog || selectedEntities.length === 0}
            className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            size="lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {loading ? 'Exporting & Zipping CSVs...' : `Export All Data to ZIP (${selectedEntities.length} CSVs)`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}