import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { PhoneCall } from "lucide-react";
import RestaurantLogo from "@/components/RestaurantLogo";
import { useBranch } from "@/components/branches/BranchContext";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import { useStagedOrder } from "@/components/pos/staged/useStagedOrder";
import StagedMenuBrowser from "@/components/pos/staged/StagedMenuBrowser";
import StagedCart from "@/components/pos/staged/StagedCart";
import CallCenterCustomerPanel from "@/components/pos/staged/CallCenterCustomerPanel";

const EMPTY = { order_type: "delivery", customer_name: "", customer_phone: "", delivery_address: "", delivery_zone_id: "", notes: "" };

export default function CallCenterPOS() {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const { items, addItem, changeQty, removeItem, setComment, clear, subtotal, summary } = useStagedOrder();
  const { selectedBranch, selectedBranchId } = useBranch();
  const { permissions } = usePermissions();
  const queryClient = useQueryClient();

  const canAccess = permissions?.pos_call_center || permissions?.pos_view || permissions?.admin_settings;

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: allMenuItems = [] } = useQuery({ queryKey: ["menuItems"], queryFn: () => base44.entities.MenuItem.list("-created_date") });
  const { data: categories = [] } = useQuery({ queryKey: ["menuCategories"], queryFn: () => base44.entities.MenuCategory.list("sort_order") });
  const { data: allSections = [] } = useQuery({ queryKey: ["menuSections"], queryFn: () => base44.entities.MenuSection.list("sort_order") });
  const { data: deliveryZones = [] } = useQuery({ queryKey: ["deliveryZones"], queryFn: () => base44.entities.DeliveryZone.list() });

  const menuItems = allMenuItems.filter((i) => i.visible_pos !== false && (!selectedBranchId || !i.branch_id || i.branch_id === selectedBranchId));
  const menuSections = allSections.filter((s) => s.is_active && s.visible_pos !== false);
  const zone = deliveryZones.find((z) => z.id === form.delivery_zone_id);
  const deliveryFee = form.order_type === "delivery" ? (zone?.delivery_fee || 0) : 0;

  const handleSubmit = async () => {
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      toast.error("Customer name and phone are required");
      return;
    }
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    setSubmitting(true);
    try {
      await base44.entities.VoiceOrder.create({
        is_call_center_order: true,
        call_center_agent: currentUser?.email || "",
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        order_type: form.order_type,
        delivery_address: form.order_type === "delivery" ? form.delivery_address.trim() : "",
        delivery_zone_id: form.order_type === "delivery" ? form.delivery_zone_id : "",
        delivery_zone_name: form.order_type === "delivery" ? (zone?.name || "") : "",
        delivery_fee: deliveryFee,
        order_items: items,
        estimated_total: subtotal + deliveryFee,
        summary,
        notes: form.notes.trim(),
        status: "pending",
        confidence: "high",
        branch_id: selectedBranchId || null,
        branch_name: selectedBranch?.name || null
      });
      queryClient.invalidateQueries({ queryKey: ["callCenterOrders"] });
      toast.success("Order sent to the cashier for approval");
      setForm(EMPTY);
      clear();
    } catch {
      toast.error("Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccess) {
    return <div className="p-10 text-center text-slate-500">You don't have access to the Call Center POS.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <RestaurantLogo className="h-9" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><PhoneCall className="w-5 h-5 text-blue-600" />Call Center POS</h1>
            <p className="text-sm text-slate-500">Take phone orders — they go to the cashier for approval.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <StagedMenuBrowser menuItems={menuItems} menuSections={menuSections} categories={categories} onAdd={addItem} />
          </div>
          <div>
            <StagedCart
              items={items}
              subtotal={subtotal}
              extraFee={deliveryFee}
              extraFeeLabel={`Delivery Fee${zone ? ` (${zone.name})` : ""}`}
              onChangeQty={changeQty}
              onRemove={removeItem}
              onComment={setComment}
              onSubmit={handleSubmit}
              submitting={submitting}
              accent="blue"
              disabled={items.length === 0}
            >
              <CallCenterCustomerPanel form={form} setForm={setForm} deliveryZones={deliveryZones} />
            </StagedCart>
          </div>
        </div>
      </div>
    </div>
  );
}