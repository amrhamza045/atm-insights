import React, { useState } from "react";

const ChevronLeft = () => <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
const ChevronRight = () => <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;

export default function CaptainTableSelector({ tables, selectedTable, onSelect, busyTableIds = [] }) {
  const [page, setPage] = useState(0);
  const sorted = [...tables].sort((a, b) =>
    (parseInt(String(a.table_number || "").replace(/\D/g, ""), 10) || 0) -
    (parseInt(String(b.table_number || "").replace(/\D/g, ""), 10) || 0));
  const perPage = 5;
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const cp = Math.min(page, totalPages - 1);
  const pageTables = sorted.slice(cp * perPage, cp * perPage + perPage);
  const emptySlots = perPage - pageTables.length;

  return (
    <div className="flex items-center gap-2 pb-2">
      <button onClick={() => setPage(Math.max(0, cp - 1))} disabled={cp === 0} className="w-8 h-8 flex-shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-50"><ChevronLeft /></button>
      <div className="grid grid-cols-5 gap-2 flex-1">
        {pageTables.map(table => {
          const hasOrder = busyTableIds.includes(table.id);
          const isSelected = selectedTable?.id === table.id;
          return (
            <button
              key={table.id}
              onClick={() => onSelect(table)}
              className={`rounded-2xl py-2.5 px-1 font-semibold text-sm transition-all flex flex-col items-center gap-1.5 ${isSelected ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400 scale-105" : hasOrder ? "bg-green-50 text-green-800 border border-green-300" : "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50"}`}
            >
              <span className="truncate">Table {table.table_number}</span>
              <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : hasOrder ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
            </button>
          );
        })}
        {Array.from({ length: emptySlots }).map((_, i) => <div key={`empty-${i}`} className="rounded-2xl border-2 border-dashed border-slate-200 py-2.5" />)}
      </div>
      <button onClick={() => setPage(Math.min(totalPages - 1, cp + 1))} disabled={cp >= totalPages - 1} className="w-8 h-8 flex-shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 hover:bg-slate-50"><ChevronRight /></button>
    </div>
  );
}