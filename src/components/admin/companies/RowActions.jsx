import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Power, Trash2 } from "lucide-react";

export default function RowActions({ active, busy, onEdit, onToggle, onDelete }) {
  return (
    <div className="flex gap-1 flex-shrink-0">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} disabled={busy} aria-label="Edit"><Pencil className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" className={`h-8 w-8 ${active ? "text-emerald-600" : "text-slate-400"}`} onClick={onToggle} disabled={busy} aria-label={active ? "Turn off" : "Turn on"}><Power className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={onDelete} disabled={busy} aria-label="Delete"><Trash2 className="w-4 h-4" /></Button>
    </div>
  );
}