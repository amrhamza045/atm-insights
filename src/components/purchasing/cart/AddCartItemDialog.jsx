import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AddCartItemDialog({ open, onOpenChange, inventoryItems, existingIds, onAdd }) {
  const [search, setSearch] = useState("");

  const matches = inventoryItems
    .filter((i) => !existingIds.includes(i.id))
    .filter((i) => (i.name || "").toLowerCase().includes(search.toLowerCase()))
    .slice(0, 40);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add an item to the cart</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search inventory items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No matching items</p>
            ) : (
              matches.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onAdd(item);
                    onOpenChange(false);
                    setSearch("");
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200"
                >
                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.category_name || "Uncategorized"} · in stock {item.quantity || 0}{" "}
                    {item.selling_unit_label || item.unit || ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}