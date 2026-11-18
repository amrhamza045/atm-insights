import React, { useMemo } from "react";
import { Clock, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
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

function calcMinutes(from, to) {
  if (!from || !to) return null;
  const diff = moment(to).diff(moment(from), "minutes", true);
  return diff >= 0 ? diff : null;
}

export default function DeliveryPerformanceDashboard({ orders }) {
  const metrics = useMemo(() => {
    const delivered = orders.filter(o => o.delivery_status === "delivered" && o.delivery_delivered_at);
    if (delivered.length === 0) {
      return { avgAck: null, avgKitchenReady: null, avgPickup: null, avgDelivery: null, avgTotal: null, count: 0, slowOrders: [] };
    }

    let ackTimes = [], kitchenTimes = [], pickupTimes = [], deliveryTimes = [], totalTimes = [];
    const slowOrders = [];

    for (const o of delivered) {
      const created = o.created_date;
      const ack = o.delivery_acknowledged_at;
      const ready = o.kitchen_ready_at;
      const pickup = o.delivery_picked_up_at;
      const delivered = o.delivery_delivered_at;

      const ackMin = calcMinutes(created, ack);
      const kitchenMin = ready ? calcMinutes(created, ready) : null;
      const pickupMin = ready ? calcMinutes(ready, pickup) : calcMinutes(ack, pickup);
      const deliveryMin = calcMinutes(pickup, delivered);
      const totalMin = calcMinutes(created, delivered);

      if (ackMin != null) ackTimes.push(ackMin);
      if (kitchenMin != null) kitchenTimes.push(kitchenMin);
      if (pickupMin != null) pickupTimes.push(pickupMin);
      if (deliveryMin != null) deliveryTimes.push(deliveryMin);
      if (totalMin != null) totalTimes.push(totalMin);

      if (totalMin != null && totalMin > 45) {
        slowOrders.push({ order: o, totalMin });
      }
    }

    const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;

    return {
      avgAck: avg(ackTimes),
      avgKitchenReady: avg(kitchenTimes),
      avgPickup: avg(pickupTimes),
      avgDelivery: avg(deliveryTimes),
      avgTotal: avg(totalTimes),
      count: delivered.length,
      slowOrders: slowOrders.sort((a, b) => b.totalMin - a.totalMin).slice(0, 5),
    };
  }, [orders]);

  if (metrics.count === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No delivered orders to analyze yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          icon={<Clock className="w-4 h-4" />}
          label="Order → Acknowledge"
          value={formatDuration(metrics.avgAck)}
          sub="avg time"
          color="blue"
        />
        <MetricCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Order → Kitchen Ready"
          value={formatDuration(metrics.avgKitchenReady)}
          sub="avg time"
          color="amber"
        />
        <MetricCard
          icon={<Clock className="w-4 h-4" />}
          label="Ready → Pickup"
          value={formatDuration(metrics.avgPickup)}
          sub="avg wait"
          color="purple"
        />
        <MetricCard
          icon={<Clock className="w-4 h-4" />}
          label="Pickup → Delivered"
          value={formatDuration(metrics.avgDelivery)}
          sub="avg transit"
          color="green"
        />
        <MetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Total: Order → Delivered"
          value={formatDuration(metrics.avgTotal)}
          sub="avg end-to-end"
          color="slate"
        />
      </div>

      {/* Slowest Orders */}
      {metrics.slowOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            Slowest Deliveries (over 45 min)
          </h3>
          <div className="space-y-2">
            {metrics.slowOrders.map(({ order, totalMin }) => (
              <div key={order.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs">
                <div>
                  <span className="font-medium text-slate-800">#{order.id?.slice(-6).toUpperCase()}</span>
                  <span className="text-slate-500 ml-2">{order.customer_name || "Customer"}</span>
                  {order.delivery_person_name && <span className="text-slate-500 ml-2">· {order.delivery_person_name}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">{moment(order.created_date).format("MMM DD, HH:mm")}</span>
                  <span className="font-bold text-red-600">{formatDuration(totalMin)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
        <p>Based on <span className="font-semibold">{metrics.count}</span> delivered {metrics.count === 1 ? "order" : "orders"}. Times are averages across all completed deliveries.</p>
      </div>
    </div>
  );
}

const colorMap = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  green: "bg-green-50 text-green-700 border-green-200",
  slate: "bg-slate-700 text-white border-slate-600",
};

function MetricCard({ icon, label, value, sub, color }) {
  return (
    <div className={`border rounded-lg p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-1 mb-1 opacity-80">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-70">{sub}</p>
    </div>
  );
}