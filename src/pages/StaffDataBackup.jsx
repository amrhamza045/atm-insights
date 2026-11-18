import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffDataBackup() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('exportStaffDataBackup', {});
      const data = response.data;

      if (data.error) throw new Error(data.error);

      // Download each entity as a separate CSV file
      Object.entries(data.entities).forEach(([entityName, entityData]) => {
        if (!entityData.csv) return;
        const blob = new Blob([entityData.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${entityName}_backup_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });

      setResults(data);
      toast.success('Backup downloaded — 5 CSV files saved to your downloads folder');
    } catch (error) {
      toast.error('Export failed: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            Staff Data Backup (Read-Only)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Exports every record from 5 staff-related entities into separate CSV files.
              Each file includes all schema fields, unique IDs, and foreign keys
              (employee_id, branch_id, etc.) for cross-referencing.
            </p>
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <ShieldCheck className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-green-700">
                This operation is 100% read-only. It performs only <code>list()</code> queries
                and never creates, updates, or deletes any record.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {['User', 'UserPermissions', 'Employee', 'Attendance', 'SalaryRecord'].map(name => (
              <div key={name} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <FileSpreadsheet className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">All fields + IDs</p>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full gap-2" size="lg">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {loading ? 'Exporting all records...' : 'Download Full Backup (5 CSV files)'}
          </Button>

          {results && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-green-700">Export completed — no data was modified</p>
              </div>
              <p className="text-xs text-slate-500">
                Exported by {results.exported_by} on {new Date(results.export_date).toLocaleString()}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {Object.entries(results.entities).map(([name, data]) => (
                  <div key={name} className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-sm font-semibold text-slate-900">{data.count}</span>
                    <span className="text-xs text-slate-500">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}