import { motion } from "framer-motion";
import { MapPin, TrendingUp } from "lucide-react";

export default function TopATMsTable({ data }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Top Performing ATMs</h3>
        <p className="text-sm text-slate-500 mt-1">By transaction volume</p>
      </div>
      
      <div className="space-y-3">
        {data.slice(0, 5).map((atm, index) => (
          <div 
            key={atm.atm_id}
            className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-indigo-600">
                  {index + 1}
                </span>
              </div>
              <div>
                <p className="font-medium text-slate-900">{atm.atm_id}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500">{atm.location || "Unknown"}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-900">{atm.count.toLocaleString()}</p>
              <p className="text-xs text-slate-500">transactions</p>
            </div>
          </div>
        ))}
        
        {data.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            No ATM data available
          </div>
        )}
      </div>
    </motion.div>
  );
}