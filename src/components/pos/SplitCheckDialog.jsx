import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Minus, User, Check, X, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import issueOrderStock from '@/components/pos/issueOrderStock';

const SPLIT_COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", name: "blue" },
  { bg: "bg-green-500", light: "bg-green-50", border: "border-green-300", text: "text-green-700", name: "green" },
  { bg: "bg-purple-500", light: "bg-purple-50", border: "border-purple-300", text: "text-purple-700", name: "purple" },
  { bg: "bg-amber-500", light: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", name: "amber" },
  { bg: "bg-pink-500", light: "bg-pink-50", border: "border-pink-300", text: "text-pink-700", name: "pink" },
  { bg: "bg-cyan-500", light: "bg-cyan-50", border: "border-cyan-300", text: "text-cyan-700", name: "cyan" },
  { bg: "bg-indigo-500", light: "bg-indigo-50", border: "border-indigo-300", text: "text-indigo-700", name: "indigo" },
  { bg: "bg-red-500", light: "bg-red-50", border: "border-red-300", text: "text-red-700", name: "red" },
  { bg: "bg-teal-500", light: "bg-teal-50", border: "border-teal-300", text: "text-teal-700", name: "teal" },
  { bg: "bg-orange-500", light: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", name: "orange" },
  { bg: "bg-lime-500", light: "bg-lime-50", border: "border-lime-300", text: "text-lime-700", name: "lime" },
  { bg: "bg-fuchsia-500", light: "bg-fuchsia-50", border: "border-fuchsia-300", text: "text-fuchsia-700", name: "fuchsia" },
  { bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", name: "emerald" },
  { bg: "bg-violet-500", light: "bg-violet-50", border: "border-violet-300", text: "text-violet-700", name: "violet" },
  { bg: "bg-rose-500", light: "bg-rose-50", border: "border-rose-300", text: "text-rose-700", name: "rose" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "visa", label: "Visa" },
  { value: "instapay", label: "Instapay" },
  { value: "wallet", label: "Wallet" },
  { value: "cl", label: "CL" },
  { value: "hospitality", label: "Hospitality" },
];

export default function SplitCheckDialog({
  open,
  onClose,
  cart,
  selectedTable,
  selectedCustomer,
  selectedCustomerId,
  taxPercentage,
  servicePercentage,
  isItemExempt,
  menuItems,
  selectedBranchId,
  selectedBranch,
  currentUser,
  manualDiscount = 0,
  onSplitsComplete
}) {
  const [splitCount, setSplitCount] = useState(2);
  const [splitNames, setSplitNames] = useState(["Guest 1", "Guest 2"]);
  const [itemSplitQty, setItemSplitQty] = useState({});
  const [splitPayments, setSplitPayments] = useState({});
  const [processing, setProcessing] = useState(false);

  // Initialize / reset when dialog opens
  useEffect(() => {
    if (open) {
      setSplitCount(2);
      setSplitNames(["Guest 1", "Guest 2"]);
      setSplitPayments({});
      setProcessing(false);
      // Default: all items go to split 0
      const initial = {};
      cart.forEach(item => {
        const key = item._cartKey || item.id;
        initial[key] = { 0: item.quantity };
      });
      setItemSplitQty(initial);
    }
  }, [open]);

  // Adjust splitNames and itemSplitQty arrays when splitCount changes
  const adjustSplitCount = (newCount) => {
    const clamped = Math.max(2, Math.min(15, newCount));
    setSplitCount(clamped);
    setSplitNames(prev => {
      const next = [...prev];
      while (next.length < clamped) next.push(`Guest ${next.length + 1}`);
      next.length = clamped;
      return next;
    });
    // Remove split qty entries beyond newCount
    setItemSplitQty(prev => {
      const next = {};
      Object.entries(prev).forEach(([key, splits]) => {
        const filtered = {};
        Object.entries(splits).forEach(([splitIdx, qty]) => {
          if (parseInt(splitIdx) < clamped && qty > 0) filtered[splitIdx] = qty;
        });
        if (Object.keys(filtered).length === 0) filtered[0] = cart.find(c => (c._cartKey || c.id) === key)?.quantity || 1;
        next[key] = filtered;
      });
      return next;
    });
  };

  const updateSplitName = (idx, name) => {
    setSplitNames(prev => prev.map((n, i) => i === idx ? name : n));
  };

  const setItemQtyForSplit = (cartKey, splitIdx, qty) => {
    setItemSplitQty(prev => {
      const current = { ...(prev[cartKey] || {}) };
      const maxQty = cart.find(c => (c._cartKey || c.id) === cartKey)?.quantity || 1;
      const newQty = Math.max(0, Math.min(maxQty, qty));
      if (newQty === 0) {
        delete current[splitIdx];
      } else {
        current[splitIdx] = newQty;
      }
      // Cap: sum of all splits must not exceed item quantity
      const totalAssigned = Object.values(current).reduce((s, v) => s + v, 0);
      if (totalAssigned > maxQty) {
        // Scale back proportionally — but simpler: just cap
        const overflow = totalAssigned - maxQty;
        current[splitIdx] = Math.max(0, newQty - overflow);
        if (current[splitIdx] === 0) delete current[splitIdx];
      }
      return { ...prev, [cartKey]: current };
    });
  };

  const moveAllToSplit = (cartKey, splitIdx) => {
    const item = cart.find(c => (c._cartKey || c.id) === cartKey);
    if (!item) return;
    setItemSplitQty(prev => ({ ...prev, [cartKey]: { [splitIdx]: item.quantity } }));
  };

  // Per-split calculations
  const splitCalculations = useMemo(() => {
    const results = [];
    for (let s = 0; s < splitCount; s++) {
      const splitItems = [];
      cart.forEach(item => {
        const key = item._cartKey || item.id;
        const qty = itemSplitQty[key]?.[s] || 0;
        if (qty > 0) {
          splitItems.push({ ...item, splitQty: qty });
        }
      });

      const subtotal = splitItems.reduce((sum, item) => {
        return sum + item.price * item.splitQty + (item.optionPriceModifier || 0) * item.splitQty;
      }, 0);

      const taxableSubtotal = splitItems.reduce((sum, item) => {
        if (isItemExempt(item, 'tax')) return sum;
        return sum + item.price * item.splitQty + (item.optionPriceModifier || 0) * item.splitQty;
      }, 0);

      const serviceSubtotal = splitItems.reduce((sum, item) => {
        if (isItemExempt(item, 'service')) return sum;
        return sum + item.price * item.splitQty + (item.optionPriceModifier || 0) * item.splitQty;
      }, 0);

      const tax = taxableSubtotal * taxPercentage;
      const service = (serviceSubtotal + tax) * servicePercentage;
      const totalBeforeDiscount = subtotal + tax + service;

      // Distribute manual discount proportionally
      const totalSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity + (item.optionPriceModifier || 0) * item.quantity, 0);
      const discountShare = totalSubtotal > 0 ? manualDiscount * (subtotal / totalSubtotal) : 0;
      const total = Math.max(0, totalBeforeDiscount - discountShare);

      results.push({ splitIndex: s, name: splitNames[s] || `Guest ${s + 1}`, items: splitItems, subtotal, tax, service, discount: discountShare, total, itemCount: splitItems.reduce((s, i) => s + i.splitQty, 0) });
    }
    return results;
  }, [cart, itemSplitQty, splitCount, splitNames, taxPercentage, servicePercentage, isItemExempt, manualDiscount]);

  const grandTotal = splitCalculations.reduce((sum, s) => sum + s.total, 0);
  const grandSubtotal = splitCalculations.reduce((sum, s) => sum + s.subtotal, 0);
  const grandTax = splitCalculations.reduce((sum, s) => sum + s.tax, 0);
  const grandService = splitCalculations.reduce((sum, s) => sum + s.service, 0);

  // Validation: all items must be fully assigned
  const unassignedItems = cart.filter(item => {
    const key = item._cartKey || item.id;
    const assigned = Object.values(itemSplitQty[key] || {}).reduce((s, v) => s + v, 0);
    return assigned < item.quantity;
  });

  const canConfirm = unassignedItems.length === 0 && splitCalculations.every(s => s.items.length > 0) && !processing;

  const handleConfirm = async () => {
    if (!canConfirm) {
      if (unassignedItems.length > 0) {
        toast.error(`${unassignedItems.length} item(s) have unassigned quantities. Assign all items to splits first.`);
      } else {
        toast.error("Each split must have at least one item.");
      }
      return;
    }

    setProcessing(true);
    try {
      // Save source lines before issuing stock; paid status follows successful stock capture.
      // 2. Find the existing dine-in order on this table (same table — update, not create new orders)
      let existingOrder = null;
      if (selectedTable) {
        const tableOrders = await base44.entities.Order.filter({ table_id: selectedTable.id, order_type: "dine_in" });
        existingOrder = tableOrders
          .filter(o => o.status !== "completed" && o.status !== "cancelled")
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      }

      // 3. Build split check configuration with guest names
      const splitCheckData = {
        enabled: true,
        split_count: splitCount,
        splits: splitCalculations.map((split) => ({
          guest_name: split.name,
          items: split.items.map(item => ({
            menu_item_id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.splitQty,
            selected_options: item.selectedOptions || {},
            option_price_modifier: item.optionPriceModifier || 0,
          })),
          subtotal: split.subtotal,
          tax: split.tax,
          service_charge: split.service,
          discount: split.discount,
          total: split.total,
          payment_method: splitPayments[split.splitIndex] || "cash",
          paid: true,
        })),
      };

      // 4. Update the existing order on the same table — do NOT free the table
      let savedOrder;
      if (existingOrder) {
        savedOrder = await base44.entities.Order.update(existingOrder.id, {
          status: "pending",
          items: cart.map(item=>({menu_item_id:item.id,name:item.name,price:item.price,quantity:item.quantity,selectedSize:item.selectedSize?.name||(typeof item.selectedSize==='string'?item.selectedSize:null),selected_options:item.selectedOptions||{},option_price_modifier:item.optionPriceModifier||0,optionsWithModifiers:item.optionsWithModifiers||{}})),
          payment_method: splitPayments[0] || "cash",
          subtotal: grandSubtotal,
          tax: grandTax,
          service_charge: grandService,
          discount_amount: splitCalculations.reduce((s, sp) => s + sp.discount, 0),
          total: grandTotal,
          split_check: splitCheckData,
          notes: `Split check (${splitCount} guests): ${splitNames.filter(Boolean).join(", ")}`,
        });
      } else {
        // No existing order on table — create one with the split check
        const orderData = {
          customer_id: selectedCustomerId,
          customer_name: selectedCustomer?.name || "Guest",
          order_type: "dine_in",
          table_id: selectedTable?.id,
          table_number: selectedTable?.table_number,
          items: cart.map(item => ({
            menu_item_id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            selected_options: item.selectedOptions || {},
            option_price_modifier: item.optionPriceModifier || 0,
            optionsWithModifiers: item.optionsWithModifiers || {},
            selectedSize: item.selectedSize?.name || (typeof item.selectedSize==='string'?item.selectedSize:null),
          })),
          subtotal: grandSubtotal,
          tax: grandTax,
          service_charge: grandService,
          total: grandTotal,
          status: "pending",
          payment_method: splitPayments[0] || "cash",
          branch_id: selectedBranchId,
          branch_name: selectedBranch?.name,
          split_check: splitCheckData,
          notes: `Split check (${splitCount} guests): ${splitNames.filter(Boolean).join(", ")}`,
        };
        savedOrder = await base44.entities.Order.create(orderData);
      }
      await issueOrderStock(savedOrder.id,cart,menuItems,{inferSize:false});
      await base44.entities.Order.update(savedOrder.id,{status:'paid'});

      // 5. Table stays occupied — cashier frees it manually when guests leave
      toast.success(`Check split into ${splitCount} — ${splitNames.filter(Boolean).join(", ")}. Total: ${formatCurrency(grandTotal)}`);

      if (onSplitsComplete) onSplitsComplete();
      onClose();
    } catch (error) {
      console.error("Split check error:", error);
      toast.error("Failed to split check: " + (error.message || "Unknown error"));
    } finally {
      setProcessing(false);
    }
  };

  const getItemSplitTotal = (cartKey) => {
    return Object.values(itemSplitQty[cartKey] || {}).reduce((s, v) => s + v, 0);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !processing && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-amber-600" />
            Split Check — Table {selectedTable?.table_number}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Assign items to each guest and name the splits. The check stays on this table — table is freed when guests leave.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Split configuration */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Splits:</span>
              <Button size="sm" variant="outline" onClick={() => adjustSplitCount(splitCount - 1)} disabled={splitCount <= 2} className="h-8 w-8 p-0">
                <Minus className="w-4 h-4" />
              </Button>
              <span className="font-bold text-lg w-8 text-center">{splitCount}</span>
              <Button size="sm" variant="outline" onClick={() => adjustSplitCount(splitCount + 1)} disabled={splitCount >= 15} className="h-8 w-8 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Badge variant="outline" className="text-xs">Max 15</Badge>
          </div>

          {/* Split name inputs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {Array.from({ length: splitCount }).map((_, idx) => {
              const color = SPLIT_COLORS[idx];
              return (
                <div key={idx} className={`rounded-lg border-2 ${color.border} ${color.light} p-2`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                    <span className="text-xs font-bold text-slate-600">#{idx + 1}</span>
                  </div>
                  <Input
                    value={splitNames[idx] || ""}
                    onChange={(e) => updateSplitName(idx, e.target.value)}
                    placeholder={`Guest ${idx + 1}`}
                    className="h-8 text-sm bg-white"
                  />
                </div>
              );
            })}
          </div>

          {/* Unassigned warning */}
          {unassignedItems.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{unassignedItems.length} item(s) have unassigned quantities. Assign all items to confirm.</span>
            </div>
          )}

          {/* Item assignment grid */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b">
                    <th className="text-left p-2 font-medium sticky left-0 bg-slate-100 z-10 min-w-[180px]">Item</th>
                    <th className="text-center p-2 font-medium min-w-[60px]">Total Qty</th>
                    <th className="text-center p-2 font-medium min-w-[60px]">Assigned</th>
                    {Array.from({ length: splitCount }).map((_, idx) => {
                      const color = SPLIT_COLORS[idx];
                      return (
                        <th key={idx} className={`text-center p-2 font-medium ${color.light} ${color.text} border-l min-w-[90px]`}>
                          <div className="flex flex-col items-center gap-0.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
                            <span className="truncate max-w-[80px] text-xs">{splitNames[idx] || `Guest ${idx + 1}`}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, itemIdx) => {
                    const key = item._cartKey || item.id;
                    const assigned = getItemSplitTotal(key);
                    const fullyAssigned = assigned >= item.quantity;
                    return (
                      <tr key={key} className={`border-b ${fullyAssigned ? "" : "bg-red-50"}`}>
                        <td className="p-2 sticky left-0 bg-inherit z-10">
                          <div className="font-medium text-xs">{item.name}</div>
                          <div className="text-xs text-slate-500">{formatCurrency(item.price)} each</div>
                          {item.optionsWithModifiers && Object.keys(item.optionsWithModifiers).length > 0 && (
                            <div className="text-xs text-slate-400">
                              {Object.values(item.optionsWithModifiers).map(o => Array.isArray(o.choices) ? o.choices.join(", ") : o.choices).join("; ")}
                            </div>
                          )}
                        </td>
                        <td className="text-center p-2 font-bold">{item.quantity}</td>
                        <td className="text-center p-2">
                          <Badge variant={fullyAssigned ? "secondary" : "destructive"} className="text-xs">
                            {assigned}/{item.quantity}
                          </Badge>
                        </td>
                        {Array.from({ length: splitCount }).map((_, splitIdx) => {
                          const color = SPLIT_COLORS[splitIdx];
                          const qty = itemSplitQty[key]?.[splitIdx] || 0;
                          return (
                            <td key={splitIdx} className={`p-1 text-center border-l ${qty > 0 ? color.light : ""}`}>
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  onClick={() => setItemQtyForSplit(key, splitIdx, qty - 1)}
                                  disabled={qty <= 0}
                                  className={`w-6 h-6 rounded flex items-center justify-center ${qty > 0 ? color.bg + " text-white" : "bg-slate-100 text-slate-300"} disabled:opacity-40`}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className={`w-7 text-center font-bold text-sm ${qty > 0 ? color.text : "text-slate-300"}`}>{qty}</span>
                                <button
                                  onClick={() => setItemQtyForSplit(key, splitIdx, qty + 1)}
                                  disabled={assigned >= item.quantity}
                                  className={`w-6 h-6 rounded flex items-center justify-center ${qty > 0 ? color.bg + " text-white" : "bg-slate-200 text-slate-500"} disabled:opacity-40`}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              {item.quantity > 1 && (
                                <button
                                  onClick={() => moveAllToSplit(key, splitIdx)}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 mt-0.5"
                                >
                                  all →
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-split summary + payment method */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-700">Per-Split Summary</h3>
            {splitCalculations.map((split) => {
              const color = SPLIT_COLORS[split.splitIndex];
              return (
                <div key={split.splitIndex} className={`rounded-lg border ${color.border} ${color.light} p-3`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                      <span className="font-bold text-sm">{split.name}</span>
                      <Badge variant="outline" className="text-xs">{split.itemCount} item(s)</Badge>
                    </div>
                    <span className={`font-bold text-lg ${color.text}`}>{formatCurrency(split.total)}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Subtotal</span>
                      <p className="font-medium">{formatCurrency(split.subtotal)}</p>
                    </div>
                    {servicePercentage > 0 && (
                      <div>
                        <span className="text-slate-500">Service ({(servicePercentage * 100).toFixed(0)}%)</span>
                        <p className="font-medium">{formatCurrency(split.service)}</p>
                      </div>
                    )}
                    {taxPercentage > 0 && (
                      <div>
                        <span className="text-slate-500">Tax ({(taxPercentage * 100).toFixed(0)}%)</span>
                        <p className="font-medium">{formatCurrency(split.tax)}</p>
                      </div>
                    )}
                    {split.discount > 0 && (
                      <div>
                        <span className="text-slate-500">Discount</span>
                        <p className="font-medium text-green-700">-{formatCurrency(split.discount)}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-500 block mb-1">Payment</span>
                      <select
                        value={splitPayments[split.splitIndex] || "cash"}
                        onChange={(e) => setSplitPayments(prev => ({ ...prev, [split.splitIndex]: e.target.value }))}
                        className="text-xs border rounded px-1 py-0.5 bg-white"
                      >
                        {PAYMENT_METHODS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand total */}
          <div className="flex items-center justify-between p-3 bg-slate-800 text-white rounded-lg">
            <div className="text-sm space-y-0.5">
              <span className="text-slate-300">Subtotal: {formatCurrency(grandSubtotal)}</span>
              {grandService > 0 && <span className="text-slate-300 ml-3">Service: {formatCurrency(grandService)}</span>}
              {grandTax > 0 && <span className="text-slate-300 ml-3">Tax: {formatCurrency(grandTax)}</span>}
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-300">Grand Total</span>
              <p className="text-2xl font-bold">{formatCurrency(grandTotal)}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex justify-between items-center">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {processing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirm Split & Pay — Table Stays Open ({formatCurrency(grandTotal)})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}