import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

const COLORS = {
  success: "#10B981",
  failed: "#EF4444",
  pending: "#F59E0B",
  cancelled: "#6B7280"
};

const CustomLegend = ({ payload }) => (
  <div className="flex flex-wrap justify-center gap-4 mt-4">
    {payload.map((entry, index) => (
      <div key={index} className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-sm text-slate-600 capitalize">{entry.value}</span>
      </div>
    ))}
  </div>
);

export default function StatusBreakdown({ data }) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    name: status,
    value: count,
    color: COLORS[status] || "#6B7280"
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Transaction Status</h3>
        <p className="text-sm text-slate-500 mt-1">Success rate breakdown</p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}