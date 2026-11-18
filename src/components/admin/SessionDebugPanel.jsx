import React from "react";

export default function SessionDebugPanel({ openSession, orders }) {
  if (!openSession) return null;

  const tzOffset = parseInt(localStorage.getItem('app_timezone_offset_minutes') || '120');
  const toLocal = (utc) => {
    const d = new Date(new Date(utc).getTime() + tzOffset * 60000);
    return d.toISOString().replace('T', ' ').slice(0, 19) + ` (UTC+${tzOffset / 60})`;
  };

  // Normalize opening_time: ensure it's treated as UTC
  const rawOpenTime = openSession.opening_time;
  const normalizedOpenTime = rawOpenTime && !rawOpenTime.endsWith('Z') && !rawOpenTime.includes('+') ? rawOpenTime + 'Z' : rawOpenTime;
  const openTimeMs = new Date(normalizedOpenTime).getTime();
  const deliveryOrders = orders.filter(o => o.order_type === "delivery");

  return (
    <div className="border-t border-green-200 pt-2 mt-2">
      <p className="text-xs font-bold text-slate-700 mb-1">🔍 Session &amp; Delivery Debug</p>
      <div className="bg-slate-100 rounded p-2 text-xs space-y-1 font-mono overflow-x-auto">
        <p>
          <span className="text-slate-500">Session opening_time (raw stored):</span>{" "}
          <span className="text-orange-600 font-semibold">{rawOpenTime}</span>
          {" "}<span className={rawOpenTime?.endsWith('Z') ? 'text-green-600' : 'text-red-600 font-bold'}>[{rawOpenTime?.endsWith('Z') ? 'has Z ✓' : 'NO Z — treated as local! ✗'}]</span>
        </p>
        <p>
          <span className="text-slate-500">Session opened (normalized UTC):</span>{" "}
          <span className="text-blue-700 font-semibold">{new Date(normalizedOpenTime).toISOString()}</span>
        </p>
        <p>
          <span className="text-slate-500">Session opened (local +{tzOffset/60}h):</span>{" "}
          <span className="text-blue-700 font-semibold">{toLocal(normalizedOpenTime)}</span>
        </p>
        <p>
          <span className="text-slate-500">Now (UTC):</span>{" "}
          <span className="text-green-700">{new Date().toISOString()}</span>
        </p>
        <p>
          <span className="text-slate-500">Now (local):</span>{" "}
          <span className="text-green-700">{toLocal(new Date().toISOString())}</span>
        </p>
        <p className="pt-1 font-bold text-slate-600">
          Today's Delivery Orders in session ({deliveryOrders.length}):
        </p>
        {deliveryOrders.length === 0 ? (
          <p className="text-red-500">No delivery orders found in session window</p>
        ) : (
          deliveryOrders.map(o => {
            // Normalize: if no trailing Z, treat as UTC by appending Z
            const rawDate = o.created_date;
            const normalizedDate = rawDate && !rawDate.endsWith('Z') && !rawDate.includes('+') ? rawDate + 'Z' : rawDate;
            const orderMs = new Date(normalizedDate).getTime();
            const isAfter = orderMs >= openTimeMs;
            return (
              <div key={o.id} className={`rounded px-1.5 py-0.5 mb-1 ${isAfter ? 'bg-green-100' : 'bg-red-100'}`}>
                <span>{isAfter ? '✅' : '❌'}</span>
                <span className="ml-1 text-slate-700 font-semibold">
                  #{o.id.slice(0, 8)} {o.customer_name} | status: {o.status}
                </span>
                <br />
                <span className="ml-4 text-slate-500">Raw stored value: <span className="text-orange-600">{rawDate}</span></span>
                <br />
                <span className="ml-4 text-slate-500">Has Z suffix: <span className={rawDate?.endsWith('Z') ? 'text-green-600' : 'text-red-600'}>{rawDate?.endsWith('Z') ? 'YES' : 'NO — treated as local!'}</span></span>
                <br />
                <span className="ml-4 text-slate-500">Normalized UTC ms: {orderMs} | Session open ms: {openTimeMs}</span>
                <br />
                <span className={`ml-4 font-semibold ${isAfter ? 'text-green-700' : 'text-red-700'}`}>
                  {isAfter ? 'AFTER session open ✓' : `BEFORE session open ✗ (diff: ${Math.round((openTimeMs - orderMs)/60000)} min early)`}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}