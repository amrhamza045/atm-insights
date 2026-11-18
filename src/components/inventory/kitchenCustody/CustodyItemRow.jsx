import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import { fmtQty } from "./kitchenCustodyLogic";
import CustodyHoldDetails from "./CustodyHoldDetails";

// One compact line per item; click to expand the per-event details.
export default function CustodyItemRow({ item, view }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr onClick={() => setOpen((o) => !o)} className="border-b border-slate-100 cursor-pointer hover:bg-slate-50">
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-2 font-medium text-slate-900">
            <ChevronRight className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
            <span className="truncate">{item.name}</span>
          </div>
        </td>
        <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-slate-900">
          {fmtQty(item.total)} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
        </td>
        <td className="py-2.5 px-4 truncate text-slate-700">{item.holds.map((h) => h.eventName).join(", ")}</td>
      </tr>
      {open && (
        <tr className="border-b border-slate-100 bg-slate-50/70">
          <td colSpan={3} className="px-4 pb-3 pt-1">
            <CustodyHoldDetails holds={item.holds} unit={item.unit} view={view} />
          </td>
        </tr>
      )}
    </>
  );
}