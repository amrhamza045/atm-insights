import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, TrendingUp, Clock, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";
import StatsCard from "../components/dashboard/StatsCard";
import TransactionChart from "../components/dashboard/TransactionChart";
import StatusBreakdown from "../components/dashboard/StatusBreakdown";
import TopATMsTable from "../components/dashboard/TopATMsTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const [selectedBatchId, setSelectedBatchId] = useState("all");
  
  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ['atm-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atm_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) {
        console.error('Error fetching logs from Supabase:', error);
        throw error;
      }
      return data || [];
    },
  });

  // Get unique upload batches
  const uploadBatches = [...new Set(allLogs.map(l => l.upload_batch_id).filter(Boolean))]
    .sort((a, b) => new Date(b) - new Date(a));

  // Filter logs by selected batch
  const logs = selectedBatchId === "all" 
    ? allLogs 
    : allLogs.filter(l => l.upload_batch_id === selectedBatchId);

  // Calculate metrics
  const totalLogs = logs.length;
  const solvedLogs = logs.filter(l => l.solved_by && l.solved_by.trim() !== "").length;
  const unsolvedLogs = totalLogs - solvedLogs;
  const solvedRate = totalLogs > 0 
    ? ((solvedLogs / totalLogs) * 100).toFixed(1)
    : 0;

  // Count unique terminals
  const uniqueTerminals = new Set(logs.map(l => l.terminal_id)).size;

  // Fault types breakdown
  const faultTypeCounts = {};
  logs.forEach(log => {
    const fault = log.fault_type || "Unknown";
    faultTypeCounts[fault] = (faultTypeCounts[fault] || 0) + 1;
  });

  // Chart data - last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'MMM dd');
    const count = logs.filter(l => {
      if (!l.starting_from) return false;
      const logDate = new Date(l.starting_from);
      return format(logDate, 'MMM dd') === dateStr;
    }).length;
    
    return { date: dateStr, count };
  });

  // Status breakdown based on solved/unsolved
  const statusData = {
    success: solvedLogs,
    failed: unsolvedLogs,
    pending: logs.filter(l => l.last_processing_step?.toLowerCase().includes('pending')).length,
    cancelled: 0
  };

  // Top terminals by issue count
  const terminalStats = {};
  logs.forEach(log => {
    if (!terminalStats[log.terminal_id]) {
      terminalStats[log.terminal_id] = {
        atm_id: log.terminal_id,
        location: log.branch,
        count: 0
      };
    }
    terminalStats[log.terminal_id].count++;
  });
  const topTerminals = Object.values(terminalStats).sort((a, b) => b.count - a.count);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">
            ATM Maintenance Dashboard
          </h1>
          <p className="text-slate-500">
            Real-time monitoring and analytics for ATM maintenance operations
          </p>
        </div>

        {/* Upload Batch Filter */}
        {uploadBatches.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-8">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Upload Batch:</span>
              </div>
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger className="w-80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Uploads ({allLogs.length} logs)</SelectItem>
                  {uploadBatches.map(batchId => {
                    const batchCount = allLogs.filter(l => l.upload_batch_id === batchId).length;
                    const batchDate = format(new Date(batchId), "MMM dd, yyyy 'at' HH:mm");
                    return (
                      <SelectItem key={batchId} value={batchId}>
                        {batchDate} ({batchCount} logs)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Issues"
            value={totalLogs.toLocaleString()}
            subtitle="All recorded issues"
            icon={Activity}
          />
          <StatsCard
            title="Resolved Rate"
            value={`${solvedRate}%`}
            subtitle={`${solvedLogs} resolved`}
            icon={TrendingUp}
            trend="up"
            trendValue={solvedRate > 80 ? "Excellent" : "Good"}
          />
          <StatsCard
            title="Active Terminals"
            value={uniqueTerminals.toLocaleString()}
            subtitle="Unique terminals"
            icon={Clock}
          />
          <StatsCard
            title="Pending Issues"
            value={unsolvedLogs.toLocaleString()}
            subtitle="Awaiting resolution"
            icon={AlertTriangle}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <TransactionChart data={last7Days} title="Issue Trends" />
          </div>
          <StatusBreakdown data={statusData} />
        </div>

        {/* Top Terminals */}
        <TopATMsTable data={topTerminals} />
      </div>
    </div>
  );
}