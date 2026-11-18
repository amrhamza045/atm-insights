import React, { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Minus, Trash2, ClipboardList, Send, Loader2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { toast } from "sonner";

export default function CaptainOrderForm({ open, onClose, menuItems = [], currentUser, selectedBranch, selectedBranchId }) {
  const [tableNumber, setTableNumber] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: tables = [] } = useQuery({
    queryKey: ["tables", selectedBranchId],
    queryFn: () => base44.entities.Table.filter({ is_active: true })
  });

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) =>
      (parseInt(String(a.table_number || "").replace(/\D/g, ""), 10) || 0) -
      (parseInt(String(b.table_number || "").replace(/\D/g, ""), 10) || 0)
    ),
    [tables]
  );

  const filteredMenu = useMemo(() => {
    if (!menuSearch.trim()) return [];
    const q = menuSearch.toLowerCase().trim();
    return menuItems.filter((m) => m.available && m.name?.toLowerCase().includes(q)).slice(0, 10);
  }, [menuItems, menuSearch]);

  const addItem = (menuItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.menu_item_id === menuItem.id);
      if (existing) return prev.map((i) => (i.menu_item_id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { menu_item_id: menuItem.id, name: menuItem.name, price: menuItem.price || 0, quantity: 1, comment: "" }];
    });
    setMenuSearch("");
  };

  const changeQty = (id, delta) => {
    setItems((prev) =>
      prev.map((i) => (i.menu_item_id === id ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0)
    );
  };

  const setComment = (id, comment) => {
    setItems((prev) => prev.map((i) => (i.menu_item_id === id ? { ...i, comment } : i)));
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const reset = () => {
    setTableNumber(""); setGuestCount(""); setCustomerName("");
    setNotes(""); setMenuSearch(""); setItems([]);
  };

  const handleSubmit = async () => {
    if (!tableNumber.trim()) { toast.error("Select or enter a table number"); return; }
    if (items.length === 0) { toast.error("Add at least one item to the order"); return; }
    setSaving(true);
    try {
      await base44.entities.VoiceOrder.create({
        is_captain_order: true,
        captain_email: currentUser?.email || "",
        captain_name: currentUser?.full_name || currentUser?.email || "",
        table_number: tableNumber.trim(),
        guest_count: parseInt(guestCount, 10) || 0,
        customer_name: customerName.trim(),
        order_type: "dine_in",
        order_items: items,
        estimated_total: subtotal,
        summary: items.map((i) => `${i.quantity}× ${i.name}`).join(", "),
        notes: notes.trim(),
        status: "pending",
        confidence: "high",
        branch_id: selectedBranchId || null,
        branch_name: selectedBranch?.name || null,
      });
      queryClient.invalidateQueries({ queryKey: ["captainOrders"] });
      toast.success("Order sent to the cashier for approval");
      reset();
      onClose();
    } catch {
      toast.error("Failed to submit order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir={document.documentElement.getAttribute("dir") || "ltr"} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-start text-start">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            New Captain Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Table selection */}
          <div className="space-y-2">
            <Label className="text-xs">Table <span className="text-red-500">*</span></Label>
            {sortedTables.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {sortedTables.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTableNumber(String(t.table_number))}
                    className={`h-12 rounded-xl text-sm font-semibold border transition-colors ${
                      tableNumber === String(t.table_number)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {t.table_number}
                  </button>
                ))}
              </div>
            )}
            <Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Or type the table number..." className="h-11" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Guests</Label>
              <Input type="number" min="0" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} placeholder="0" className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Guest Name (optional)</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Guest name" className="h-11" />
            </div>
          </div>

          {/* Item picker */}
          <div className="space-y-2">
            <Label className="text-xs">Add Items</Label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder="Search the whole menu..." className="ps-10 h-11" />
            </div>
            {filteredMenu.length > 0 && (
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {filteredMenu.map((m) => (
                  <button key={m.id} onClick={() => addItem(m)} className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-slate-50">
                    <span className="text-sm">{m.name}</span>
                    <span className="text-xs text-slate-500">{formatCurrency(m.price || 0)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected items */}
          {items.length > 0 && (
            <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
              {items.map((i) => (
                <div key={i.menu_item_id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{i.name}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(i.price)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => changeQty(i.menu_item_id, -1)} className="h-9 w-9 p-0"><Minus className="w-4 h-4" /></Button>
                    <span className="w-8 text-center text-sm font-medium">{i.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => changeQty(i.menu_item_id, 1)} className="h-9 w-9 p-0"><Plus className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => changeQty(i.menu_item_id, -i.quantity)} className="h-9 w-9 p-0"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                  <Input value={i.comment || ""} onChange={(e) => setComment(i.menu_item_id, e.target.value)} placeholder="Item note (optional)" className="h-8 text-xs" />
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 border-t text-sm">
                <span>Items Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <p className="text-xs text-slate-500">Tax, service and discounts are applied by the cashier on approval.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Table Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, timing, special requests..." rows={2} />
          </div>

          <div className="flex items-center justify-end pt-1 gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to Cashier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}