import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendValue, className }) {
  const isPositive = trend === "up";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-500 tracking-wide uppercase">
            {title}
          </p>
          <p className="text-3xl font-semibold text-slate-900 tracking-tight">
            {value}
          </p>
          {(subtitle || trendValue) && (
            <div className="flex items-center gap-2">
              {trendValue && (
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  {isPositive ? "↑" : "↓"} {trendValue}
                </span>
              )}
              {subtitle && (
                <span className="text-sm text-slate-400">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Icon className="w-5 h-5 text-indigo-600" />
          </div>
        )}
      </div>
    </motion.div>
  );
}