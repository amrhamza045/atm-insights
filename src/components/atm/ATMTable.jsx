import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ATMTable({ logs, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">Terminal ID</TableHead>
              <TableHead className="font-semibold text-slate-700">Branch</TableHead>
              <TableHead className="font-semibold text-slate-700">Module</TableHead>
              <TableHead className="font-semibold text-slate-700">Event</TableHead>
              <TableHead className="font-semibold text-slate-700">Fault Type</TableHead>
              <TableHead className="font-semibold text-slate-700">Starting From</TableHead>
              <TableHead className="font-semibold text-slate-700">Duration</TableHead>
              <TableHead className="font-semibold text-slate-700">Solved By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log, index) => (
              <TableRow 
                key={log.id || index}
                className="hover:bg-slate-50/50 transition-colors"
              >
                <TableCell className="font-medium text-slate-900">
                  {log.terminal_id}
                </TableCell>
                <TableCell className="text-slate-600">
                  {log.branch || "—"}
                </TableCell>
                <TableCell className="text-slate-600">
                  {log.module_name || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    {log.event || "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-600">
                  {log.fault_type || "—"}
                </TableCell>
                <TableCell className="text-slate-600">
                  {log.starting_from 
                    ? format(new Date(log.starting_from), "MMM d, yyyy HH:mm")
                    : "—"
                  }
                </TableCell>
                <TableCell className="text-slate-600">
                  {log.duration || "—"}
                </TableCell>
                <TableCell className="text-slate-600">
                  {log.solved_by || "—"}
                </TableCell>
              </TableRow>
            ))}
            
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  No logs found. Upload an Excel file to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}