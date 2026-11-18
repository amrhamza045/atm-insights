import { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Filter, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ATMTable from "../components/atm/ATMTable";

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [faultFilter, setFaultFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['atm-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atm_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) {
        console.error('Error fetching logs from Supabase:', error);
        throw error;
      }
      return data || [];
    },
  });

  // Get unique branches and fault types for filters
  const branches = ["all", ...new Set(logs.map(l => l.branch).filter(Boolean))];
  const faultTypes = ["all", ...new Set(logs.map(l => l.fault_type).filter(Boolean))];

  // Apply filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.terminal_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.branch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBranch = branchFilter === "all" || log.branch === branchFilter;
    const matchesFault = faultFilter === "all" || log.fault_type === faultFilter;
    
    return matchesSearch && matchesBranch && matchesFault;
  });

  const handleExport = () => {
    // Convert logs to CSV
    const headers = ['Terminal ID', 'Branch', 'Module', 'Event', 'Fault Type', 'Starting From', 'Duration', 'Solved By', 'Maintenance Remark'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        log.terminal_id,
        log.branch || '',
        log.module_name || '',
        log.event || '',
        log.fault_type || '',
        log.starting_from || '',
        log.duration || '',
        log.solved_by || '',
        `"${log.maintenance_remark || ''}"` // Quote remarks in case they contain commas
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atm-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">
              Maintenance Logs
            </h1>
            <p className="text-slate-500">
              {filteredLogs.length} of {logs.length} logs
            </p>
          </div>
          
          <Button
            onClick={handleExport}
            className="bg-indigo-600 hover:bg-indigo-700 mt-4 md:mt-0"
            disabled={filteredLogs.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search terminal, branch, module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch} value={branch}>
                    {branch === "all" ? "All Branches" : branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={faultFilter} onValueChange={setFaultFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by fault type" />
              </SelectTrigger>
              <SelectContent>
                {faultTypes.map(fault => (
                  <SelectItem key={fault} value={fault}>
                    {fault === "all" ? "All Fault Types" : fault}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Table */}
        <ATMTable logs={filteredLogs} isLoading={isLoading} />
      </div>
    </div>
  );
}