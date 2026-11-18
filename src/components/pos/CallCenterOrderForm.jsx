import React, { useState, useMemo } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, PhoneCall, Send, Loader2, UtensilsCrossed, ShoppingBag, Truck } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { toast } from "sonner";

const ORDER_TYPES = [
  { value: "delivery", label: "Delivery", icon: Truck },
  { value: "takeaway", label: "Takeaway", icon: ShoppingBag },
  { value: "dine_in", label: "Dine-In", icon: UtensilsCrossed },
];

export default function CallCenterOrderForm({ open, onClose, menuItems = [], currentUser, selectedBranch, selectedBranchId }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderType, setOrderType] = useState("delivery");
  const [zoneId, setZoneId] = useState("");
  const [notes, setNotes] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const filteredMenu = useMemo(() => {
    if (!menuSearch.trim()) return [];
    const q = menuSearch.toLowerCase().trim();
    return menuItems.filter((m) => m.available && m.name?.toLowerCase().includes(q)).slice(0, 8);
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

  const { data: zones = [] } = useQuery({
    queryKey: ["deliveryZones", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.DeliveryZone.filter({ is_active: true });
      return selectedBranchId ? all.filter((z) => !z.branch_id || z.branch_id === selectedBranchId) : all;
    }
  });

  const selectedZone = zones.find((z) => z.id === zoneId) || null;
  const deliveryFee = orderType === "delivery" ? (selectedZone?.delivery_fee || 0) : 0;

  const { data: settings } = useQuery({
    queryKey: ["taxSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "payment_numbers" });
      return result[0] || {};
    }
  });

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const taxRate = (() => {
    if (orderType === "delivery") return (selectedBranch?.delivery_tax_percentage ?? settings?.delivery_tax_percentage ?? 0) / 100;
    if (orderType === "dine_in") return (selectedBranch?.dine_in_tax_percentage ?? settings?.dine_in_tax_percentage ?? 0) / 100;
    if (orderType === "takeaway") return (selectedBranch?.takeaway_tax_percentage ?? settings?.takeaway_tax_percentage ?? 0) / 100;
    return (settings?.default_tax_percentage || 0) / 100;
  })();

  const serviceRate = (() => {
    if (orderType === "delivery") return (selectedBranch?.delivery_service_percentage ?? settings?.delivery_service_percentage ?? 0) / 100;
    if (orderType === "dine_in") return (selectedBranch?.dine_in_service_percentage ?? settings?.dine_in_service_percentage ?? 0) / 100;
    if (orderType === "takeaway") return (selectedBranch?.takeaway_service_percentage ?? settings?.takeaway_service_percentage ?? 0) / 100;
    return (settings?.default_service_percentage || 0) / 100;
  })();

  // Mirrors POS: service applies to dine-in only; delivery fee is part of the tax base
  const serviceAmount = orderType === "dine_in" ? subtotal * serviceRate : 0;
  const taxAmount = (subtotal + deliveryFee) * taxRate;
  const estimatedTotal = subtotal + serviceAmount + taxAmount + deliveryFee;

  const reset = () => {
    setCustomerName(""); setCustomerPhone(""); setDeliveryAddress("");
    setOrderType("delivery"); setNotes(""); setMenuSearch(""); setItems([]); setZoneId("");
  };

  const handleSubmit = async () => {
    if (!customerPhone.trim()) { toast.error("Customer phone is required"); return; }
    if (items.length === 0) { toast.error("Add at least one item to the order"); return; }
    setSaving(true);
    try {
      await base44.entities.VoiceOrder.create({
        is_call_center_order: true,
        call_center_agent: currentUser?.email || "",
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_address: orderType === "delivery" ? deliveryAddress.trim() : "",
        delivery_zone_id: orderType === "delivery" ? (selectedZone?.id || null) : null,
        delivery_zone_name: orderType === "delivery" ? (selectedZone?.name || "") : "",
        delivery_fee: deliveryFee,
        order_type: orderType,
        order_items: items,
        estimated_total: estimatedTotal,
        summary: items.map((i) => `${i.quantity}× ${i.name}`).join(", "),
        notes: notes.trim(),
        status: "pending",
        confidence: "high",
        branch_id: selectedBranchId || null,
        branch_name: selectedBranch?.name || null,
      });
      queryClient.invalidateQueries({ queryKey: ["callCenterOrders"] });
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
      <DialogContent dir={document.documentElement.getAttribute("dir") || "ltr"} className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-start text-start">
            <PhoneCall className="w-5 h-5 text-blue-600" />
            Call Center Orders
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order type */}
          <div className="flex gap-2">
            {ORDER_TYPES.map((t) => (
              <Button key={t.value} variant={orderType === t.value ? "default" : "outline"} size="sm" onClick={() => setOrderType(t.value)} className="gap-1.5">
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </Button>
            ))}
          </div>

          {/* Customer */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone <span className="text-red-500">*</span></Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" />
            </div>
          </div>

          {orderType === "delivery" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Delivery Zone</Label>
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery zone..." />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name} — {formatCurrency(z.delivery_fee || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {orderType === "delivery" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Delivery Address</Label>
              <Textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Street, building, floor, landmark..." rows={2} />
            </div>
          )}

          {/* Item picker */}
          <div className="space-y-2">
            <Label className="text-xs">Add Items</Label>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder="Search menu..." className="ps-10" />
            </div>
            {filteredMenu.length > 0 && (
              <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
                {filteredMenu.map((m) => (
                  <button key={m.id} onClick={() => addItem(m)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50">
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
                    <Button size="sm" variant="outline" onClick={() => changeQty(i.menu_item_id, -1)} className="h-7 w-7 p-0"><Minus className="w-3.5 h-3.5" /></Button>
                    <span className="w-7 text-center text-sm font-medium">{i.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => changeQty(i.menu_item_id, 1)} className="h-7 w-7 p-0"><Plus className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => changeQty(i.menu_item_id, -i.quantity)} className="h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </div>
                  <Input value={i.comment || ""} onChange={(e) => setComment(i.menu_item_id, e.target.value)} placeholder="Item note (optional)" className="h-7 text-xs" />
                </div>
              ))}
              <div className="pt-2 border-t space-y-1 text-sm">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {serviceAmount > 0 && (
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>Service {(serviceRate * 100).toFixed(0)}%</span>
                    <span>{formatCurrency(serviceAmount)}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>Delivery — {selectedZone?.name}</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>VAT {(taxRate * 100).toFixed(0)}%</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(estimatedTotal)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Call Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the customer mentioned on the call..." rows={2} />
          </div>

          <div className="flex items-center justify-end pt-1">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send to Cashier
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}