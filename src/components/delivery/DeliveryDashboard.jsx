import React, { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CheckCircle2, Navigation, Clock, Truck } from "lucide-react";
import moment from "moment";

function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes)) return "—";
  if (minutes < 1) return "< 1m";
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  if (m < 60) return `${m}m${s > 0 ? ` ${s}s` : ""}`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

const STATUS_LABELS = {
  pending: "Pending",
  acknowledged: "Acknowledged",
  in_delivery: "In Progress",
  delivered: "Completed",
  failed: "Failed",
};

export default function DeliveryDashboard({ orders, deliveryPersons }) {
  const { todayData, driverData } = useMemo(() => {
    const today = moment().format("YYYY-MM-DD");

    const todayOrders = orders.filter(o => o.created_date && moment(o.created_date).isSame(today, "day"));

    const completed = todayOrders.filter(o => o.delivery_status === "delivered").length;
    const inProgress = todayOrders.filter(o => ["pending", "acknowledged", "in_delivery"].includes(o.delivery_status || "pending")).length;
    const failed = todayOrders.filter(o => o.delivery_status === "failed").length;

    const todayData = [
      { name: "Completed", value: completed, color: "#22c55e" },
      { name: "In Progress", value: inProgress, color: "#3b82f6" },
      { name: "Failed", value: failed, color: "#ef4444" },
    ].filter(d => d.value > 0);

    // Per-driver average delivery time
    const driverStats = {};
    for (const o of orders) {
      if (o.delivery_status !== "delivered" || !o.delivery_delivered_at || !o.delivery_picked_up_at) continue;
      const transitMin = moment(o.delivery_delivered_at).diff(moment(o.delivery_picked_up_at), "minutes", true);
      if (transitMin < 0 || isNaN(transitMin)) continue;

      const driverId = o.delivery_person_id;
      const driverName = o.delivery_person_name || "Unassigned";
      if (!driverStats[driverId]) {
        driverStats[driverId] = { name: driverName, deliveries: 0, totalTime: 0 };
      }
      driverStats[driverId].deliveries += 1;
      driverStats[driverId].totalTime += transitMin;
    }

    const driverData = Object.values(driverStats)
      .map(d => ({
        name: d.name,
        avgTime: Math.round((d.totalTime / d.deliveries) * 10) / 10,
        deliveries: d.deliveries,
      }))
      .sort((a, b) => a.avgTime - b.avgTime);

    return { todayData, driverData };
  }, [orders]);

  const totalToday = todayData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Truck className="w-4 h-4" />}
          label="Total Today"
          value={totalToday}
          color="slate"
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Completed"
          value={todayData.find(d => d.name === "Completed")?.value || 0}
          color="green"
        />
        <SummaryCard
          icon={<Navigation className="w-4 h-4" />}
          label="In Progress"
          value={todayData.find(d => d.name === "In Progress")?.value || 0}
          color="blue"
        />
        <SummaryCard
          icon={<Clock className="w-4 h-4" />}
          label="Active Drivers"
          value={driverData.length}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart: Completed vs In Progress */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Today's Deliveries</h3>
          <p className="text-xs text-slate-400 mb-3">Completed vs in progress for {moment().format("MMM DD, YYYY")}</p>
          {totalToday === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
              No deliveries today yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={todayData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {todayData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart: Avg delivery time per driver */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Average Delivery Time per Driver</h3>
          <p className="text-xs text-slate-400 mb-3">Average transit time (pickup → delivered) in minutes</p>
          {driverData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
              No completed deliveries with driver data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={driverData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" unit="m" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip
                  formatter={(value, name, props) => [
                    `${formatDuration(value)} (${props.payload.deliveries} deliveries)`,
                    "Avg Time",
                  ]}
                />
                <Bar dataKey="avgTime" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

const colorMap = {
  slate: "bg-slate-700 text-white border-slate-600",
  green: "bg-green-50 text-green-700 border-green-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
};

function SummaryCard({ icon, label, value, color }) {
  return (
    <div className={`border rounded-lg p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-1 mb-1 opacity-80">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}