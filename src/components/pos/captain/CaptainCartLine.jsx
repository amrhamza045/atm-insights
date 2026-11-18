import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, MessageSquare, X } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function CaptainCartLine({ item, onQty, onRemove, onComment }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.comment || "");

  return (
    <div className="flex items-start gap-2 p-2.5 rounded bg-slate-50">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm break-words">{item.name}</p>
        {item.optionsWithModifiers && Object.keys(item.optionsWithModifiers).length > 0 && (
          <div className="text-xs text-slate-500 mt-1 space-y-1">
            {Object.entries(item.optionsWithModifiers).map(([optId, optData]) => {
              const choices = optData.choices || [];
              const mod = optData.totalModifier || 0;
              return (
                <div key={optId} className="flex justify-between">
                  <span>{Array.isArray(choices) ? choices.join(", ") : choices}</span>
                  {mod > 0 && <span className="text-green-700 font-medium">+{formatCurrency(mod * item.quantity)}</span>}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-slate-500">{formatCurrency(item.price)}</p>
        {item.optionPriceModifier > 0 && (
          <p className="text-xs text-green-700 font-medium">Options: +{formatCurrency(item.optionPriceModifier * item.quantity)}</p>
        )}
        {item.comment && !editing && (
          <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
            <span className="font-semibold text-amber-800">Note: </span>
            <span className="text-amber-700 break-words">{item.comment}</span>
          </div>
        )}
        {editing && (
          <div className="mt-1.5 flex flex-col gap-1.5 w-full">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add note..." className="h-8 text-xs w-full" autoFocus />
            <div className="flex gap-1">
              <Button size="sm" onClick={() => { onComment(item._cartKey, text); setEditing(false); }} className="h-7 px-2 text-xs flex-1">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setText(item.comment || ""); setEditing(false); }} className="h-7 px-2 text-xs flex-1">Cancel</Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 items-end">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(!editing)} className="h-7 w-7 p-0" title={item.comment ? "Edit note" : "Add note"}>
            <MessageSquare className={`w-3.5 h-3.5 ${item.comment ? "text-amber-600" : "text-slate-400"}`} />
          </Button>
          {item.comment && (
            <Button size="sm" variant="ghost" onClick={() => { onComment(item._cartKey, ""); setText(""); }} className="h-7 w-7 p-0" title="Remove note">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => onQty(item._cartKey, -1)} className="h-7 w-7 p-0"><Minus className="w-3.5 h-3.5" /></Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button size="sm" variant="outline" onClick={() => onQty(item._cartKey, 1)} className="h-7 w-7 p-0"><Plus className="w-3.5 h-3.5" /></Button>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onRemove(item._cartKey)} className="h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
      </div>
    </div>
  );
}