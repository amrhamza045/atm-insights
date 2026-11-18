import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UtensilsCrossed, ClipboardList, MessageSquareHeart } from "lucide-react";
import RestaurantLogo from "@/components/RestaurantLogo";
import CaptainMenuItemCard from "@/components/pos/captain/CaptainMenuItemCard";
import ItemOptionsDialog from "@/components/pos/ItemOptionsDialog";
import { useBranch } from "@/components/branches/BranchContext";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import { useCaptainCart } from "@/components/pos/captain/useCaptainCart";
import CaptainCustomerCard from "@/components/pos/captain/CaptainCustomerCard";
import CaptainSectionTabs from "@/components/pos/captain/CaptainSectionTabs";
import CaptainTableSelector from "@/components/pos/captain/CaptainTableSelector";
import CaptainCategorySidebar from "@/components/pos/captain/CaptainCategorySidebar";
import CaptainCartCard from "@/components/pos/captain/CaptainCartCard";
import CaptainPendingOrderBanner from "@/components/pos/captain/CaptainPendingOrderBanner";
import CaptainFeedbackDialog from "@/components/pos/captain/CaptainFeedbackDialog";
import { buildCaptainOrderItems, sumOrderItems } from "@/components/pos/captain/captainOrderItems";

export default function CaptainPOS() {
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedSection, setSelectedSection] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [menuSearch, setMenuSearch] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [itemOptionsOpen, setItemOptionsOpen] = useState(false);
  const [selectedItemForOptions, setSelectedItemForOptions] = useState(null);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const { cart, addWithOptions, updateQuantity, removeItem, setComment, clear, subtotal } = useCaptainCart();
  const { selectedBranch, selectedBranchId } = useBranch();
  const { permissions } = usePermissions();
  const queryClient = useQueryClient();

  const canAccess = permissions?.pos_captain || permissions?.pos_view || permissions?.admin_settings;

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: allMenuItems = [] } = useQuery({ queryKey: ["menuItems"], queryFn: () => base44.entities.MenuItem.list("-created_date") });
  const { data: allCategories = [] } = useQuery({ queryKey: ["menuCategories"], queryFn: () => base44.entities.MenuCategory.list("sort_order") });
  const { data: allMenuSections = [] } = useQuery({ queryKey: ["menuSections"], queryFn: () => base44.entities.MenuSection.list("sort_order") });
  const { data: tables = [] } = useQuery({ queryKey: ["tables", selectedBranchId], queryFn: () => base44.entities.Table.filter({ is_active: true }) });
  const { data: dineInOrders = [] } = useQuery({
    queryKey: ["orders", "dine_in_status", selectedBranchId],
    queryFn: async () => {
      const o = await base44.entities.Order.filter({ order_type: "dine_in" });
      return o.filter(x => x.status !== "completed" && x.status !== "cancelled");
    }
  });
  const { data: pendingCaptainOrders = [] } = useQuery({
    queryKey: ["captainOrders", "pending", selectedBranchId],
    queryFn: () => base44.entities.VoiceOrder.filter({ is_captain_order: true, status: "pending" }, "-created_date")
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list("-created_date") });
  const { data: settings } = useQuery({
    queryKey: ["paymentSettings"],
    queryFn: async () => {
      const r = await base44.entities.SystemSettings.filter({ setting_key: "payment_numbers" });
      return r[0] || {};
    }
  });

  const menuItems = allMenuItems.filter(i => i.visible_pos !== false && (!selectedBranchId || !i.branch_id || i.branch_id === selectedBranchId));
  const menuSections = allMenuSections.filter(s => s.is_active && s.visible_pos !== false);

  const categories = useMemo(() => {
    let cats = allCategories.filter(c => c.is_active && c.visible_pos !== false);
    if (selectedSection !== "all") cats = cats.filter(c => c.section_id === selectedSection);
    cats = cats.filter(c => menuItems.some(i => i.category === c.name && i.available));
    return ["all", ...cats.map(c => c.name)];
  }, [allCategories, selectedSection, menuItems]);

  // An order already waiting for cashier approval on this table — new items append to it
  const pendingOrderForTable = selectedTable
    ? pendingCaptainOrders.find(o =>
        String(o.table_number) === String(selectedTable.table_number) &&
        (!selectedBranchId || !o.branch_id || o.branch_id === selectedBranchId)
      ) || null
    : null;

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = !menuSearch || item.name?.toLowerCase().includes(menuSearch.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory && item.available;
    });
  }, [menuItems, menuSearch, categoryFilter]);

  // Head chef / head barista guidance: push items first, slow-down items last
  const steeringRank = (item) => (item.sell_priority === "push" ? 0 : item.sell_priority === "slow" ? 2 : 1);
  const sortedMenuItems = useMemo(
    () => [...filteredMenuItems].sort((a, b) => steeringRank(a) - steeringRank(b)),
    [filteredMenuItems]
  );

  // Live sync so guidance set in the kitchen shows on the floor immediately
  useEffect(() => {
    return base44.entities.MenuItem.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
    });
  }, [queryClient]);

  const taxPercentage = (selectedBranch?.dine_in_tax_percentage ?? settings?.dine_in_tax_percentage ?? 0) / 100;
  const servicePercentage = (selectedBranch?.dine_in_service_percentage ?? settings?.dine_in_service_percentage ?? 0) / 100;
  const tax = subtotal * taxPercentage;
  const service = (subtotal + tax) * servicePercentage;
  const total = subtotal + tax + service;

  const addToCart = (item) => {
    if (!selectedTable) {
      toast.error("Please select a table before adding items.");
      return;
    }
    if (item.sell_priority === "slow") {
      toast.warning(item.steering_note || `${item.name} — the kitchen asked to slow this one down.`);
    }
    setSelectedItemForOptions({ ...item });
    setItemOptionsOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedTable) { toast.error("Select a table"); return; }
    if (cart.length === 0) { toast.error("Add at least one item"); return; }
    setSubmitting(true);
    const newItems = buildCaptainOrderItems(cart);
    try {
      if (pendingOrderForTable) {
        // Make sure the cashier hasn't approved it in the meantime
        const fresh = await base44.entities.VoiceOrder.get(pendingOrderForTable.id);
        if (fresh?.status !== "pending") {
          queryClient.invalidateQueries({ queryKey: ["captainOrders"] });
          toast.error("That order was already processed by the cashier — send these items as a new order.");
          setSubmitting(false);
          return;
        }
        const mergedItems = [...(fresh.order_items || []), ...newItems];
        await base44.entities.VoiceOrder.update(fresh.id, {
          order_items: mergedItems,
          estimated_total: sumOrderItems(mergedItems),
          notes: [fresh.notes, notes.trim()].filter(Boolean).join(" | ")
        });
        queryClient.invalidateQueries({ queryKey: ["captainOrders"] });
        toast.success(`Items added to Table ${selectedTable.table_number}'s pending order`);
        clear();
        setNotes("");
        setSubmitting(false);
        return;
      }
      await base44.entities.VoiceOrder.create({
        is_captain_order: true,
        captain_email: currentUser?.email || "",
        captain_name: currentUser?.full_name || currentUser?.email || "",
        table_number: String(selectedTable.table_number),
        guest_count: parseInt(guestCount, 10) || 0,
        customer_name: selectedCustomer?.name || "",
        customer_phone: selectedCustomer?.phone || "",
        order_type: "dine_in",
        order_items: newItems,
        estimated_total: sumOrderItems(newItems),
        notes: notes.trim(),
        status: "pending",
        confidence: "high",
        branch_id: selectedBranchId || null,
        branch_name: selectedBranch?.name || null
      });
      queryClient.invalidateQueries({ queryKey: ["captainOrders"] });
      toast.success("Order sent to the cashier for approval");
      clear();
      setGuestCount("");
      setNotes("");
      setSelectedTable(null);
      setSelectedCustomer(null);
    } catch {
      toast.error("Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccess) {
    return <div className="p-10 text-center text-slate-500">You don't have access to the Captain POS.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <RestaurantLogo className="h-9" />
            <h1 className="text-2xl font-bold">Captain Orders</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 border-rose-300 text-rose-700 hover:bg-rose-50" onClick={() => setFeedbackOpen(true)}>
              <MessageSquareHeart className="w-4 h-4" />
              Guest Feedback
            </Button>
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <ClipboardList className="w-4 h-4" />
              Orders go to the cashier for approval
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <Button variant="default" className="gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Dine-In {selectedTable && `(Table ${selectedTable.table_number})`}
            </Button>
          </div>
          <CaptainTableSelector
            tables={tables}
            selectedTable={selectedTable}
            onSelect={(t) => setSelectedTable(t)}
            busyTableIds={dineInOrders.map(o => o.table_id)}
          />
        </div>

        <CaptainSectionTabs
          menuSections={menuSections}
          selectedSection={selectedSection}
          onSelect={(id) => { setSelectedSection(id); setCategoryFilter("all"); }}
        />

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-2">
            <CaptainCategorySidebar categories={categories} categoryFilter={categoryFilter} onSelect={setCategoryFilter} />
          </div>

          <div className="lg:col-span-5 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search menu..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {sortedMenuItems.map(item => (
                <CaptainMenuItemCard key={item.id} item={item} onAdd={addToCart} />
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <CaptainCustomerCard clients={clients} selectedCustomer={selectedCustomer} onSelect={setSelectedCustomer} />
            <CaptainCartCard
              pendingBanner={<CaptainPendingOrderBanner pendingOrder={pendingOrderForTable} />}
              isAppending={!!pendingOrderForTable}
              cart={cart}
              selectedTable={selectedTable}
              subtotal={subtotal}
              tax={tax}
              service={service}
              taxPercentage={taxPercentage}
              servicePercentage={servicePercentage}
              total={total}
              guestCount={guestCount}
              onGuestCount={setGuestCount}
              notes={notes}
              onNotes={setNotes}
              onQty={updateQuantity}
              onRemove={removeItem}
              onComment={setComment}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </div>
        </div>

        <ItemOptionsDialog
          item={selectedItemForOptions}
          open={itemOptionsOpen}
          onClose={() => { setItemOptionsOpen(false); setSelectedItemForOptions(null); }}
          onAdd={addWithOptions}
        />

        <CaptainFeedbackDialog
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          selectedTable={selectedTable}
          selectedCustomer={selectedCustomer}
          currentUser={currentUser}
          branchId={selectedBranchId}
          branchName={selectedBranch?.name}
        />
      </div>
    </div>
  );
}