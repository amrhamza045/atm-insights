import React from "react";
import { motion } from "framer-motion";
import { fmtQty } from "./kitchenCustodyLogic";

// Expanded detail for one item: every event it is held for.
export default function CustodyHoldDetails({ holds, unit, view }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="overflow-hidden"
    >
      <table className="w-full text-xs">
        <thead className="text-slate-500">
          <tr>
            <th className="py-1.5 pr-3 text-left font-medium">Event</th>
            <th className="py-1.5 pr-3 text-left font-medium">Date</th>
            <th className="py-1.5 pr-3 text-left font-medium">{view === "kitchen" ? "In kitchen" : "Reserved"}</th>
            <th className="py-1.5 pr-3 text-left font-medium">For dish</th>
            <th className="py-1.5 text-left font-medium">Responsible</th>
          </tr>
        </thead>
        <tbody>
          {holds.map((h) => (
            <tr key={h.eventId} className="border-t border-slate-200/70 text-slate-700">
              <td className="py-1.5 pr-3 font-medium text-slate-900">{h.eventName}</td>
              <td className="py-1.5 pr-3 whitespace-nowrap">{h.eventDate || "—"}</td>
              <td className="py-1.5 pr-3 whitespace-nowrap">{fmtQty(h.quantity)} {unit}</td>
              <td className="py-1.5 pr-3">{h.producing.join(", ") || "—"}</td>
              <td className="py-1.5">{h.staff.join(", ") || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}