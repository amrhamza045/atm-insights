import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2, Loader, Eye, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

import { useBranch } from '@/components/branches/BranchContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BranchInventoryTransferCard from '@/components/admin/BranchInventoryTransferCard';

const MODULE_LIST = [
  { key: "Order", label: "Orders", icon: "📦" },
  { key: "MenuItem", label: "Menu Items", icon: "🍽️" },
  { key: "Employee", label: "Employees", icon: "👥" },
  { key: "CashierSession", label: "Cashier Sessions", icon: "💰" },
  { key: "InventoryItem", label: "Inventory Items", icon: "📊" },
  { key: "Supplier", label: "Suppliers", icon: "🚚" },
  { key: "DeliveryPerson", label: "Delivery Persons", icon: "🏍️" },
  { key: "Attendance", label: "Attendance Records", icon: "⏰" },
  { key: "SalaryRecord", label: "Salary Records", icon: "💳" },
  { key: "PurchaseInvoice", label: "Purchase Invoices", icon: "📄" },
  { key: "PurchaseOrder", label: "Purchase Orders", icon: "📋" },
  { key: "WasteDeclaration", label: "Waste Declarations", icon: "🗑️" },
  { key: "Deposit", label: "Deposits", icon: "🏦" },
  { key: "Payout", label: "Payouts", icon: "💸" },
  { key: "Address", label: "Delivery Addresses", icon: "📍" },
  { key: "Lead", label: "Leads", icon: "📞" },
  { key: "RegistrationRequest", label: "Registration Requests", icon: "📝" },
  { key: "LevelUpgradeRequest", label: "Level Upgrade Requests", icon: "⬆️" },
  { key: "CashbackTransaction", label: "Cashback Transactions", icon: "💎" },
  { key: "PageView", label: "Page Views", icon: "📈" },
  { key: "OrderChangeLog", label: "Order Change Logs", icon: "🔄" },
  { key: "AuditLog", label: "Audit Logs", icon: "🔐" },
];

export default function BulkBranchReassignment() {
  const { branches = [] } = useBranch();
  const [targetBranchId, setTargetBranchId] = useState("");
  const targetBranch = branches.find(b => b.id === targetBranchId);
  const BRANCH_ID = targetBranch?.id;
  const BRANCH_NAME = targetBranch?.name;
  const [selectedModules, setSelectedModules] = useState([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  // Check if modules have unassigned records
  const { data: moduleStats, isLoading: isCheckingModules } = useQuery({
    queryKey: ['moduleStats', selectedModules],
    queryFn: async () => {
      if (selectedModules.length === 0) return null;

      const stats = {};
      for (const moduleName of selectedModules) {
        try {
          const entity = base44.asServiceRole.entities[moduleName];
          const records = await entity.filter(
            { $or: [{ branch_id: null }, { branch_name: "Unknown" }] },
            '-created_date',
            1,
            0
          );
          stats[moduleName] = records.length > 0 ? records.length : 0;
        } catch (err) {
          stats[moduleName] = 0;
        }
      }
      return stats;
    },
    enabled: isReviewing && selectedModules.length > 0
  });

  const handleModuleToggle = (moduleName) => {
    setSelectedModules(prev =>
      prev.includes(moduleName)
        ? prev.filter(m => m !== moduleName)
        : [...prev, moduleName]
    );
  };

  const handleSelectAll = () => {
    if (selectedModules.length === MODULE_LIST.length) {
      setSelectedModules([]);
    } else {
      setSelectedModules(MODULE_LIST.map(m => m.key));
    }
  };

  const handleReviewClick = async () => {
    if (selectedModules.length === 0) {
      toast.error('Please select at least one module to review');
      return;
    }
    setIsReviewing(true);
  };

  const handleStartReassignment = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const reassignResults = [];

      for (let i = 0; i < selectedModules.length; i++) {
        const moduleName = selectedModules[i];
        const progress = { current: i + 1, total: selectedModules.length, entity: moduleName };

        try {
          const entity = base44.asServiceRole.entities[moduleName];
          let totalUpdated = 0;
          let hasMore = true;
          let skip = 0;
          let iterations = 0;
          const maxIterations = 50;

          while (hasMore && iterations < maxIterations) {
            const records = await entity.filter(
              { $or: [{ branch_id: null }, { branch_name: "Unknown" }] },
              '-created_date',
              500,
              skip
            );

            if (!records || records.length === 0) {
              hasMore = false;
              break;
            }

            const updatePayload = records.map(r => ({
              id: r.id,
              branch_id: BRANCH_ID,
              branch_name: BRANCH_NAME
            }));

            for (let j = 0; j < updatePayload.length; j += 500) {
              const batch = updatePayload.slice(j, j + 500);
              try {
                await entity.bulkUpdate(batch);
                totalUpdated += batch.length;
              } catch (err) {
                for (const item of batch) {
                  try {
                    await entity.update(item.id, { branch_id: BRANCH_ID, branch_name: BRANCH_NAME });
                    totalUpdated++;
                  } catch (e2) {
                    // Skip individual failures
                  }
                }
              }
            }

            skip += records.length;
            if (records.length < 500) hasMore = false;
            iterations++;
          }

          if (totalUpdated > 0) {
            reassignResults.push({
              module: MODULE_LIST.find(m => m.key === moduleName)?.label || moduleName,
              updated: totalUpdated,
              status: 'success'
            });
          } else {
            reassignResults.push({
              module: MODULE_LIST.find(m => m.key === moduleName)?.label || moduleName,
              updated: 0,
              status: 'no_changes'
            });
          }
        } catch (err) {
          reassignResults.push({
            module: MODULE_LIST.find(m => m.key === moduleName)?.label || moduleName,
            error: err.message,
            status: 'error'
          });
        }
      }

      setResults(reassignResults);
      const totalUpdated = reassignResults.reduce((sum, r) => sum + (r.updated || 0), 0);
      toast.success(`Reassignment complete! ${totalUpdated} records updated.`);
    } catch (err) {
      toast.error('Reassignment failed: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const successCount = results?.filter(r => r.status === 'success').length || 0;
  const totalRecordsUpdated = results?.reduce((sum, r) => sum + (r.updated || 0), 0) || 0;
  const totalUnassignedRecords = useMemo(() => {
    if (!moduleStats) return 0;
    return Object.values(moduleStats).reduce((sum, count) => sum + count, 0);
  }, [moduleStats]);

  return (
    <div className="space-y-6">
      <BranchInventoryTransferCard />
      <Card>
        <CardHeader>
          <CardTitle>Target branch</CardTitle>
          <CardDescription>Unassigned records will be moved to this branch</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={targetBranchId} onValueChange={setTargetBranchId}>
            <SelectTrigger><SelectValue placeholder="Choose a branch" /></SelectTrigger>
            <SelectContent>
              {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      {/* Module Selection Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Play className="w-5 h-5" />
            Step 1: Select Modules to Reassign
          </CardTitle>
          <CardDescription>Choose which application modules to review and reassign</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b">
            <Checkbox
              id="select-all"
              checked={selectedModules.length === MODULE_LIST.length}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-semibold cursor-pointer">
              {selectedModules.length === MODULE_LIST.length ? 'Deselect All' : 'Select All'} ({selectedModules.length}/{MODULE_LIST.length})
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODULE_LIST.map(module => (
              <div key={module.key} className="flex items-center gap-3 p-3 border border-blue-100 rounded-lg hover:bg-blue-100/50 transition-colors cursor-pointer"
                onClick={() => handleModuleToggle(module.key)}>
                <Checkbox
                  id={module.key}
                  checked={selectedModules.includes(module.key)}
                  onCheckedChange={() => handleModuleToggle(module.key)}
                />
                <label htmlFor={module.key} className="flex-1 cursor-pointer">
                  <span className="text-lg mr-2">{module.icon}</span>
                  <span className="font-medium text-slate-900">{module.label}</span>
                </label>
              </div>
            ))}
          </div>

          <Button
            onClick={handleReviewClick}
            disabled={!targetBranch || selectedModules.length === 0 || isCheckingModules || isReviewing}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCheckingModules || isReviewing ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Reviewing Selected Modules...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Review Selected Modules
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Review Results Card */}
      {isReviewing && moduleStats && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertCircle className="w-5 h-5" />
              Step 2: Review Records to Reassign
            </CardTitle>
            <CardDescription>Shows how many unassigned records exist in each selected module</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-amber-100">
              <p className="text-lg font-bold text-amber-900">
                Total Unassigned Records: <span className="text-amber-600">{totalUnassignedRecords}</span>
              </p>
              <p className="text-sm text-amber-700 mt-1">
                These records will be reassigned to: <span className="font-semibold">{BRANCH_NAME}</span>
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedModules.map(moduleName => {
                const count = moduleStats[moduleName] || 0;
                const moduleLabel = MODULE_LIST.find(m => m.key === moduleName)?.label || moduleName;
                const moduleIcon = MODULE_LIST.find(m => m.key === moduleName)?.icon || "📦";

                return (
                  <div key={moduleName} className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{moduleIcon}</span>
                      <span className="font-medium text-slate-900">{moduleLabel}</span>
                    </div>
                    <div className="text-right">
                      {count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
                          {count} record{count !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                          ✓ All assigned
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalUnassignedRecords > 0 ? (
              <Button
                onClick={handleStartReassignment}
                disabled={isRunning}
                size="lg"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isRunning ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Reassigning Records...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Bulk Reassignment
                  </>
                )}
              </Button>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-700 font-semibold">✓ All selected modules have all records properly assigned</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Card */}
      {results && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle2 className="w-5 h-5" />
              Step 3: Reassignment Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-white border border-green-200 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Reassignment Successful</p>
                <p className="text-sm text-green-700">
                  {successCount} module{successCount !== 1 ? 's' : ''} updated • {totalRecordsUpdated.toLocaleString()} total records reassigned
                </p>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white border border-green-100 rounded-lg">
                  <span className="font-medium text-slate-900">{result.module}</span>
                  {result.status === 'success' ? (
                    <span className="text-green-600 font-semibold">✓ {result.updated} updated</span>
                  ) : result.status === 'no_changes' ? (
                    <span className="text-slate-500 text-sm">No changes needed</span>
                  ) : (
                    <span className="text-red-600 text-xs">{result.error || 'Error'}</span>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={() => {
                setResults(null);
                setIsReviewing(false);
                setSelectedModules([]);
              }}
              size="lg"
              className="w-full"
            >
              Start New Reassignment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}