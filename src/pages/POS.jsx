import React, { useState, useMemo, useEffect } from "react";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, Search, Plus, Minus, Trash2, User, Users,
  PoundSterling, CreditCard, Wallet, X, AlertCircle, 
  UtensilsCrossed, Truck, ShoppingBag, History, Printer, Star, MessageSquare, Check,
  Send, History as HistoryIcon, Coins, Mic, PhoneCall, ClipboardList
} from "lucide-react";
import TableActions from "@/components/pos/TableActions";
import MinimumChargeDialog from "@/components/pos/MinimumChargeDialog";
import CashbackRedemption from "@/components/pos/CashbackRedemption";
import PrinterSelectDialog from "@/components/pos/PrinterSelectDialog";
import ItemOptionsDialog from "@/components/pos/ItemOptionsDialog";
import AddCustomerDialog from "@/components/pos/AddCustomerDialog";
import OrderHistoryDialog from "@/components/pos/OrderHistoryDialog";
import OrderHistoryView from "@/components/pos/OrderHistoryView";
import PaidOrderLockNotice from "@/components/pos/PaidOrderLockNotice";
import WebsiteOrdersPanel from "@/components/pos/WebsiteOrdersPanel";
import UnpaidDeliveryOrders from "@/components/pos/UnpaidDeliveryOrders";
import UnpaidOrdersPanel from "@/components/pos/UnpaidOrdersPanel";
import DeliverySelectionForm from "@/components/pos/DeliverySelectionForm";
import TalabatReceiptUploader from "@/components/pos/TalabatReceiptUploader";
import { toast } from "sonner";
import { handleCheckoutOrder } from "@/components/pos/CheckoutHandler";
import POSMenuItemCard from "@/components/pos/POSMenuItemCard";
import { printReceipt } from "@/components/pos/ReceiptPrinter";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import SplitCheckDialog from "@/components/pos/SplitCheckDialog";
import { useBranch } from "@/components/branches/BranchContext";
import RestaurantLogo from "@/components/RestaurantLogo";
import { usePosVersionGuard } from "@/hooks/usePosVersionGuard";
import { usePermissions } from "@/components/permissions/PermissionsContext";
import VoiceOrdersModal from "@/components/pos/VoiceOrdersModal";
import CallCenterOrdersModal from "@/components/pos/CallCenterOrdersModal";
import CallCenterOrderForm from "@/components/pos/CallCenterOrderForm";
import CaptainOrdersModal from "@/components/pos/CaptainOrdersModal";
import CaptainOrderForm from "@/components/pos/CaptainOrderForm";
import StagedRoleLanding from "@/components/pos/StagedRoleLanding";
import PaymentMethodSelector from "@/components/pos/PaymentMethodSelector";
import ForceCloseTableButton from "@/components/pos/ForceCloseTableButton";
import { useModuleAccess } from "@/hooks/useModuleAccess";

export default function POS() {
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderType, setOrderType] = useState("dine_in");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null); const [tablePage, setTablePage] = useState(0);
  const [cashbackDiscount, setCashbackDiscount] = useState(0);
  const [manualDiscountPercent, setManualDiscountPercent] = useState(0);
  const [manualDiscountFixed, setManualDiscountFixed] = useState(0);
  const [manualDiscountMode, setManualDiscountMode] = useState("percentage"); // "percentage" or "fixed"
  const [isProEnabled, setIsProEnabled] = useState(false);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState(null);
  const [selectedDeliveryZone, setSelectedDeliveryZone] = useState(null);
  const [selectedDeliveryCompany, setSelectedDeliveryCompany] = useState(null);
  const [printerDialogOpen, setPrinterDialogOpen] = useState(false);
  const [orderToPrint, setOrderToPrint] = useState(null);
  const [itemOptionsOpen, setItemOptionsOpen] = useState(false);
  const [selectedItemForOptions, setSelectedItemForOptions] = useState(null);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [preparedItems, setPreparedItems] = useState([]);
  const [orderHistoryDialogOpen, setOrderHistoryDialogOpen] = useState(false);
  const [previousCart, setPreviousCart] = useState([]);
  const [editingComment, setEditingComment] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [receiptUsageType, setReceiptUsageType] = useState("none");
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(false);
  const [visaAmount, setVisaAmount] = useState("");
  const [secondaryPaymentMethod, setSecondaryPaymentMethod] = useState("cash");
  const [selectedDeliveryAddress, setSelectedDeliveryAddress] = useState(null);
  const [deliveryReceiptData, setDeliveryReceiptData] = useState(null); // { receipt_photo_url, scanned_payment_method, receipt_id }
  const [completingPaymentForOrder, setCompletingPaymentForOrder] = useState(null);
  const [minChargeDialogOpen, setMinChargeDialogOpen] = useState(false);
  const [splitCheckOpen, setSplitCheckOpen] = useState(false); const [showVoiceOrders, setShowVoiceOrders] = useState(false); const [activeVoiceOrderId, setActiveVoiceOrderId] = useState(null);
  const [showCallCenterOrders, setShowCallCenterOrders] = useState(false);
  const [showCallCenterForm, setShowCallCenterForm] = useState(false);
  const [showCaptainOrders, setShowCaptainOrders] = useState(false);
  const [showCaptainForm, setShowCaptainForm] = useState(false);
  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const { permissions } = usePermissions();
  const { isModuleEnabled } = useModuleAccess();
  // Order-taking modes apply only to people without full POS access.
  const hasFullPos = !!(permissions?.pos_view || permissions?.pos_access);
  const isCaptain = !hasFullPos && !!permissions?.pos_captain;
  const isCallCentre = !hasFullPos && !!permissions?.pos_call_center;
  // Only managers/admins (pos_delete) may remove or reduce items already sent to kitchen, or void orders
  const canVoidOrders = !!permissions?.pos_delete;
  // Once an order is paid and the table is closed, only someone entitled to edit
  // or approve POS orders may still change it — entitlement, not role name.
  const isManagerRole = !!(permissions?.pos_edit || permissions?.pos_approve);
  const isItemSent = (item) => preparedItems.some(p =>
    p.id === item.id && JSON.stringify(p.selectedOptions) === JSON.stringify(item.selectedOptions)
  );

  const { data: allMenuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list("-created_date")
  });

  const menuItems = allMenuItems.filter(item => item.visible_pos !== false && (!selectedBranchId || !item.branch_id || item.branch_id === selectedBranchId));

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date")
  });

  const { data: settings } = useQuery({
    queryKey: ["paymentSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "payment_numbers" });
      return result[0] || { default_tax_percentage: 0, default_service_percentage: 0 };
    }
  });

  const { data: rootClientSettings } = useQuery({
    queryKey: ["rootClientSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "default_root_client" });
      return result[0];
    }
  });

  const { data: posClientSettings } = useQuery({
    queryKey: ["posClientSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "pos_client_settings" });
      return result[0];
    }
  });

  const { data: printerSettings } = useQuery({
    queryKey: ["printerSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "printer_settings" });
      return result[0];
    }
  });

  const { data: printers = [] } = useQuery({
    queryKey: ["printers", selectedBranchId],
    queryFn: async () => {
      const allPrinters = await base44.entities.Printer.filter({ is_enabled: true });
      return allPrinters.filter(p => !selectedBranchId || !p.branch_id || p.branch_id === selectedBranchId);
    }
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: stockReviewSettings } = useQuery({
    queryKey: ["stockReviewSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "stock_review_settings" });
      return result[0];
    }
  });

  const { data: globalDiscountSettings = {} } = useQuery({
    queryKey: ["globalDiscountSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "global_discount_settings" });
      return result[0] || {};
    },
  });

  const { data: currentSession } = useQuery({
    queryKey: ["currentCashierSession", selectedBranchId],
    queryFn: async () => {
      // First try to find an open session for the selected branch, then fall back to any open session
      if (selectedBranchId) {
        const branchSessions = await base44.entities.CashierSession.filter({ status: "open", branch_id: selectedBranchId });
        if (branchSessions.length > 0) return branchSessions[0];
      }
      // Fallback: get any open session
      const allSessions = await base44.entities.CashierSession.filter({ status: "open" });
      return allSessions[0] || null;
    }
  });

  const isStockReviewActive = () => {
    if (!stockReviewSettings?.stock_review_freeze_enabled) return false;
    // If no time window set, freeze is always active when enabled
    if (!stockReviewSettings?.stock_review_freeze_start || !stockReviewSettings?.stock_review_freeze_end) return true;
    const now = new Date();
    return now >= new Date(stockReviewSettings.stock_review_freeze_start) && now <= new Date(stockReviewSettings.stock_review_freeze_end);
  };
  const isItemFrozen = (menuItem) => {
    if (!isStockReviewActive()) return false;
    if (stockReviewSettings?.stock_review_freeze_type === "full") return true;
    if (stockReviewSettings?.stock_review_freeze_type === "partial") {
      const frozenCats = stockReviewSettings?.stock_review_frozen_categories || [];
      if (frozenCats.length === 0) return false;
      // Check the menu item's own MenuCategory
      const menuCat = allCategories.find(c => c.name === menuItem.category);
      if (menuCat && frozenCats.includes(menuCat.id)) return true;
      // Check recipe ingredient inventory categories
      if (menuItem.recipe?.length > 0 && menuItem.recipe.some(i => frozenCats.includes(i.category_id))) return true;
    }
    return false;
  };

  const { data: cashbackTiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list("min_referrals")
  });

  const orders = useOrderHistory(orderType);

  // Fetch unpaid orders for current session (all types)
  const { data: unpaidSessionOrders = [] } = useQuery({
    queryKey: ["unpaidSessionOrders", currentSession?.id, orderType],
    queryFn: async () => {
      const allOrders = await base44.entities.Order.list("-created_date", 500);
      const sessionStart = currentSession?.created_date ? new Date(currentSession.created_date) : null;
      return allOrders.filter(o =>
        o.order_type === orderType &&
        ["preparing", "pending", "ready"].includes(o.status) &&
        (!sessionStart || new Date(o.created_date) >= sessionStart)
      );
    },
    enabled: !!currentSession,
    refetchInterval: 30000
  });

  // Keep delivery-specific alias for backward compat
  const unpaidDeliveryOrders = orderType === "delivery" ? unpaidSessionOrders : [];

  // Fetch website pending orders separately
  const { data: websiteOrders = [] } = useQuery({
    queryKey: ["websiteOrders"],
    queryFn: async () => {
      const allOrders = await base44.entities.Order.list("-created_date", 2000);
      return allOrders.filter(o => 
        o.status === "pending" && 
        o.order_type === "delivery" && 
        o.notes?.includes("[Website Order - Awaiting Cashier Review]") &&
        (!selectedBranchId || o.branch_id === selectedBranchId)
      );
    }
  });

  const { data: allMenuSections = [] } = useQuery({
    queryKey: ["menuSections"],
    queryFn: () => base44.entities.MenuSection.list("sort_order")
  });

  const isDelivery = orderType === "delivery";
  const { data: allDeliveryPersons = [] } = useQuery({ queryKey: ["deliveryPersons", selectedBranchId], queryFn: () => base44.entities.DeliveryPerson.filter({ status: "active" }), enabled: isDelivery, staleTime: 300000 });
  const deliveryPersons = allDeliveryPersons.filter(p => !p.branch_id || p.branch_id === selectedBranchId);
  const { data: deliveryZones = [] } = useQuery({ queryKey: ["deliveryZones", selectedBranchId], queryFn: () => base44.entities.DeliveryZone.list(), enabled: isDelivery, staleTime: 300000 });
  const { data: allDeliveryCompanies = [] } = useQuery({ queryKey: ["deliveryCompanies", selectedBranchId], queryFn: () => base44.entities.DeliveryCompany.list(), enabled: isDelivery, staleTime: 300000 });
  const deliveryCompanies = allDeliveryCompanies.filter(c => c.is_active !== false && (!c.branch_id || c.branch_id === selectedBranchId));
  const { data: customerAddresses = [] } = useQuery({ queryKey: ["addresses", selectedCustomerId], queryFn: () => base44.entities.Address.filter({ client_id: selectedCustomerId }), enabled: !!selectedCustomerId && isDelivery });

  const { data: tables = [] } = useQuery({ queryKey: ["tables", selectedBranchId], queryFn: async () => { const t = await base44.entities.Table.filter({ is_active: true }); return t.sort((a,b) => (parseInt(String(a.table_number||"").replace(/\D/g,""),10)||0)-(parseInt(String(b.table_number||"").replace(/\D/g,""),10)||0)); } }); const { data: voiceOrders = [] } = useQuery({ queryKey: ["voiceOrders", selectedBranchId], queryFn: async () => { const all = await base44.entities.VoiceOrder.list("-created_date", 100); return all.filter(o => !o.is_call_center_order && !o.is_captain_order && ["pending","processing","flagged","approved"].includes(o.status) && (!selectedBranchId || !o.branch_id || o.branch_id === selectedBranchId)); }, refetchInterval: 15000 });

  const { data: callCenterOrders = [] } = useQuery({
    queryKey: ["callCenterOrders", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.VoiceOrder.filter({ is_call_center_order: true }, "-created_date", 100);
      return all.filter(o => ["pending", "approved"].includes(o.status) && (!selectedBranchId || !o.branch_id || o.branch_id === selectedBranchId));
    },
    refetchInterval: 15000
  });

  const { data: captainOrders = [] } = useQuery({
    queryKey: ["captainOrders", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.VoiceOrder.filter({ is_captain_order: true }, "-created_date", 100);
      return all.filter(o => ["pending", "approved"].includes(o.status) && (!selectedBranchId || !o.branch_id || o.branch_id === selectedBranchId));
    },
    refetchInterval: 15000
  });

  const { data: dineInOrders = [] } = useQuery({ queryKey: ["orders", "dine_in_status", selectedBranchId], queryFn: async () => { const o = await base44.entities.Order.filter({ order_type: "dine_in" }); return o.filter(x => x.status !== "completed" && x.status !== "cancelled"); } });

  const { data: orderHistory = [] } = useQuery({ queryKey: ["orderHistory", selectedTable?.id], queryFn: async () => { const h = await base44.entities.OrderChangeLog.filter({ table_id: selectedTable.id }); return h.sort((a,b) => new Date(b.created_date)-new Date(a.created_date)); }, enabled: !!selectedTable?.id });

  // Paid/closed order on the selected table — locked for everyone except managers
  const selectedTablePaidOrder = selectedTable
    ? dineInOrders.find(o => o.table_id === selectedTable.id && (o.status === "paid" || o.status === "completed"))
    : null;
  const orderLocked = !!selectedTablePaidOrder && !isManagerRole;
  const warnLocked = () => toast.error("This order is already paid and the table is closed. Only a manager or restaurant manager can edit or delete it.");

  const menuSections = allMenuSections.filter(s => s.is_active && s.visible_pos !== false);
  const [selectedSection, setSelectedSection] = useState("all");

  const createOrderMutation = useMutation({ mutationFn: (data) => base44.entities.Order.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orders"] }); queryClient.invalidateQueries({ queryKey: ["tables"] }); toast.success("Order placed successfully!"); } });
  const updateTableMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.Table.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }) });
  const createPurchaseMutation = useMutation({ mutationFn: (data) => base44.entities.Purchase.create(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }) });
  const updateClientMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.Client.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }) });
  const createClientMutation = useMutation({ mutationFn: (data) => base44.entities.Client.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("Customer added successfully"); } });

  const selectedCustomer = clients.find(c => c.id === selectedCustomerId);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const query = customerSearch.toLowerCase().trim();
    return clients.filter(c => 
      c.name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query)
    );
  }, [clients, customerSearch]);

  const { data: allCategories = [] } = useQuery({
    queryKey: ["menuCategories"],
    queryFn: () => base44.entities.MenuCategory.list("sort_order")
  });

  // Filter categories by selected section
  const filteredCategoriesData = useMemo(() => {
    let cats = allCategories.filter(cat => cat.is_active && cat.visible_pos !== false);
    if (selectedSection !== "all") {
      cats = cats.filter(cat => cat.section_id === selectedSection);
    }
    return cats.filter(cat => 
      menuItems.some(item => item.category === cat.name && item.available)
    );
  }, [allCategories, selectedSection, menuItems]);

  const categories = useMemo(() => {
    return ["all", ...filteredCategoriesData.map(cat => cat.name)];
  }, [filteredCategoriesData]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = !menuSearch || item.name?.toLowerCase().includes(menuSearch.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory && item.available;
    });
  }, [menuItems, menuSearch, categoryFilter]);

  const getItemPrice = (item) => {
    if (isDelivery && selectedDeliveryCompany && selectedDeliveryCompany.delivery_type !== "direct" && item.indirect_price) return item.indirect_price;
    return item.price;
  };

  const addToCart = (item) => {
    if (orderLocked) { warnLocked(); return; }
    if (orderType === "dine_in" && !selectedTable) {
      toast.error("Please select a table before adding items.");
      return;
    }
    if (isItemFrozen(item)) {
      toast.error(`"${item.name}" is unavailable — partial stock review in progress for this category.`);
      return;
    }
    setSelectedItemForOptions({ ...item, price: getItemPrice(item) });
    setItemOptionsOpen(true);
  };

  const handleItemOptionsSubmit = async (itemWithOptions) => {
    const newCart = [...cart];
    const sizeMatch = (c) => (c.selectedSize?.name || null) === (itemWithOptions.selectedSize?.name || null);
    const existing = cart.find(c => c.id === itemWithOptions.id && sizeMatch(c) && JSON.stringify(c.selectedOptions) === JSON.stringify(itemWithOptions.selectedOptions));

    if (existing) {
      await logOrderChange("quantity_increased", itemWithOptions.name, existing.quantity, existing.quantity + itemWithOptions.quantity);
      const updatedCart = cart.map(c => 
        c._cartKey === existing._cartKey
          ? {...c, quantity: c.quantity + itemWithOptions.quantity} 
          : c
      );
      setCart(updatedCart);
    } else {
      await logOrderChange("item_added", itemWithOptions.name);
      const cartKey = `${itemWithOptions.id}_reg_${Date.now()}`;
      newCart.push({ ...itemWithOptions, _cartKey: cartKey });
    }
    
    // Add optional items as separate line items
    if (itemWithOptions.optionalItems && itemWithOptions.optionalItems.length > 0) {
      itemWithOptions.optionalItems.forEach((optItem, idx) => {
        const optionalLineItem = {
          id: `${itemWithOptions.id}_opt_${optItem.itemOptionId}_${idx}`,
          name: `${optItem.optionName}: ${optItem.choices}`,
          price: optItem.priceModifier / (optItem.quantity || 1),
          quantity: (optItem.quantity || 1) * itemWithOptions.quantity,
          selectedOptions: {},
          optionPriceModifier: 0,
          optionsWithModifiers: {},
          isOptionalAddon: true,
          parentItemId: itemWithOptions.id
        };
        newCart.push(optionalLineItem);
      });
      setCart(newCart);
    } else if (!existing) {
      setCart(newCart);
    }
  };

  const logOrderChange = async (changeType, itemName, previousQty = null, newQty = null, details = null) => {
    if (!selectedTable) return;
    const existingOrder = dineInOrders.find(o => o.table_id === selectedTable.id);
    await base44.entities.OrderChangeLog.create({ order_id: existingOrder?.id || "pending", table_id: selectedTable.id, table_number: selectedTable.table_number, change_type: changeType, item_name: itemName, previous_quantity: previousQty, new_quantity: newQty, details, cashier_name: currentUser?.full_name || currentUser?.email, branch_id: selectedBranchId, branch_name: selectedBranch?.name });
    queryClient.invalidateQueries({ queryKey: ["orderHistory", selectedTable.id] });
  };

  // Update qty by _cartKey (unique per cart line)
  const updateQuantity = async (cartKey, delta) => {
    if (orderLocked) { warnLocked(); return; }
    const item = cart.find(c => c._cartKey === cartKey);
    if (!item) return;
    if (delta < 0 && isItemSent(item) && !canVoidOrders) {
      toast.error("Only a manager can reduce or remove items already sent to the kitchen.");
      return;
    }
    const newQty = item.quantity + delta;
    if (newQty <= 0) { await logOrderChange("item_removed", item.name); setCart(cart.filter(c => c._cartKey !== cartKey)); }
    else { await logOrderChange(delta > 0 ? "quantity_increased" : "quantity_decreased", item.name, item.quantity, newQty); setCart(cart.map(c => c._cartKey === cartKey ? {...c, quantity: newQty} : c)); }
  };
  const updateQuantityById = async (itemId, delta) => {
    const item = cart.find(c => c.id === itemId);
    if (!item) return;
    return updateQuantity(item._cartKey, delta);
  };
  const removeFromCart = async (cartKey) => {
    if (orderLocked) { warnLocked(); return; }
    const item = cart.find(c => c._cartKey === cartKey);
    if (item && isItemSent(item) && !canVoidOrders) {
      toast.error("Only a manager can remove items already sent to the kitchen.");
      return;
    }
    if (item) await logOrderChange("item_removed", item.name);
    setCart(cart.filter(c => c._cartKey !== cartKey));
  };
  const removeFromCartById = async (itemId) => {
    const item = cart.find(c => c.id === itemId);
    if (item) return removeFromCart(item._cartKey);
  };


  const subtotal = cart.reduce((sum, item) => {
    const baseTotal = item.price * item.quantity;
    const optionTotal = (item.optionPriceModifier || 0) * item.quantity;
    return sum + baseTotal + optionTotal;
  }, 0);
  const manualDiscount = manualDiscountMode === "percentage"
    ? Math.round(subtotal * manualDiscountPercent / 100 * 100) / 100
    : Math.min(manualDiscountFixed, subtotal);

  const isItemExempt = (cartItem, checkType) => {
    const menuItem = menuItems.find(m => m.id === cartItem.id);
    if (!menuItem) return false;
    if (checkType === 'tax' && menuItem.tax_exempt) return true;
    if (checkType === 'service' && menuItem.service_exempt) return true;
    const category = allCategories.find(c => c.name === menuItem.category);
    if (category) { if (checkType === 'tax' && category.tax_exempt) return true; if (checkType === 'service' && category.service_exempt) return true; }
    if (category?.section_id) { const section = allMenuSections.find(s => s.id === category.section_id); if (section) { if (checkType === 'tax' && section.tax_exempt) return true; if (checkType === 'service' && section.service_exempt) return true; } }
    return false;
  };

  const taxableSubtotal = cart.reduce((sum, item) => isItemExempt(item, 'tax') ? sum : sum + item.price * item.quantity + (item.optionPriceModifier || 0) * item.quantity, 0);
  const serviceChargeableSubtotal = cart.reduce((sum, item) => isItemExempt(item, 'service') ? sum : sum + item.price * item.quantity + (item.optionPriceModifier || 0) * item.quantity, 0);
  
  const getDeliveryFee = () => {
    if (!isDelivery || isProEnabled || !selectedDeliveryZone) return 0;
    if (selectedDeliveryCompany && selectedDeliveryZone.company_specific_fees?.[selectedDeliveryCompany.id]) return selectedDeliveryZone.company_specific_fees[selectedDeliveryCompany.id];
    return selectedDeliveryZone.delivery_fee || 0;
  };
  const deliveryFee = getDeliveryFee();
  const calculateCompanyFee = () => {
    if (!isDelivery || !selectedDeliveryCompany || selectedDeliveryCompany.additional_fee_type === "none") return 0;
    if (selectedDeliveryCompany.additional_fee_type === "fixed") return selectedDeliveryCompany.additional_fee_value || 0;
    if (selectedDeliveryCompany.additional_fee_type === "percentage") return subtotal * ((selectedDeliveryCompany.additional_fee_value || 0) / 100);
    return 0;
  };
  const companyFee = calculateCompanyFee();
  // Global discount applies to direct orders only (Dine-In, Takeaway, or own Direct Delivery — not third-party)
  const isDirectDelivery = !isDelivery || (selectedDeliveryCompany?.delivery_type === "direct");
  const globalDiscountPercent = (isDirectDelivery && globalDiscountSettings?.global_discount_enabled) ? (
    orderType === "dine_in" ? (globalDiscountSettings.global_discount_dine_in_percent || 0) :
    orderType === "takeaway" ? (globalDiscountSettings.global_discount_takeaway_percent || 0) :
    isDelivery ? (globalDiscountSettings.global_discount_delivery_percent || 0) : 0
  ) / 100 : 0;
  const globalDiscountAmount = globalDiscountPercent > 0 ? subtotal * globalDiscountPercent : 0;

  const getOrderTotal = (sub, tax, service, delivery, compFee) => Math.max(0, sub + tax + service + delivery + compFee - cashbackDiscount - manualDiscount - globalDiscountAmount);
  
  const getTaxPercentage = () => {
    if (isDelivery && selectedDeliveryCompany) { if (selectedDeliveryCompany.is_subject_to_tax === false) return 0; return (selectedBranch?.delivery_tax_percentage ?? settings?.delivery_tax_percentage ?? 0) / 100; }
    if (orderType === "dine_in") return (selectedBranch?.dine_in_tax_percentage ?? settings?.dine_in_tax_percentage ?? 0) / 100;
    if (orderType === "takeaway") return (selectedBranch?.takeaway_tax_percentage ?? settings?.takeaway_tax_percentage ?? 0) / 100;
    return (settings?.default_tax_percentage || 0) / 100;
  };
  const getServicePercentage = () => {
    if (orderType === "dine_in") return (selectedBranch?.dine_in_service_percentage ?? settings?.dine_in_service_percentage ?? 0) / 100;
    if (isDelivery) return (selectedBranch?.delivery_service_percentage ?? settings?.delivery_service_percentage ?? 0) / 100;
    if (orderType === "takeaway") return (selectedBranch?.takeaway_service_percentage ?? settings?.takeaway_service_percentage ?? 0) / 100;
    return (settings?.default_service_percentage || 0) / 100;
  };
  const shouldApplyTax = () => { if (orderType === "dine_in" || orderType === "takeaway") return true; if (isDelivery) return selectedDeliveryCompany ? selectedDeliveryCompany.is_subject_to_tax !== false : true; return false; };
  const shouldApplyService = () => orderType === "dine_in";

  const taxPercentage = getTaxPercentage();
  const servicePercentage = getServicePercentage();
  // Discounts (manual, global) reduce the tax & service base — free and discounted items are excluded from tax & service entirely
  const priceDiscountAmount = manualDiscount + globalDiscountAmount;
  const taxableDiscount = subtotal > 0 ? priceDiscountAmount * (taxableSubtotal / subtotal) : 0;
  const serviceDiscount = subtotal > 0 ? priceDiscountAmount * (serviceChargeableSubtotal / subtotal) : 0;
  const effectiveTaxableSubtotal = Math.max(0, taxableSubtotal - taxableDiscount);
  const effectiveServiceSubtotal = Math.max(0, serviceChargeableSubtotal - serviceDiscount);
  const taxBase = orderType === "delivery" ? effectiveTaxableSubtotal + deliveryFee : effectiveTaxableSubtotal;
  const tax = shouldApplyTax() ? taxBase * taxPercentage : 0;
  const service = shouldApplyService() ? (effectiveServiceSubtotal + tax) * servicePercentage : 0;
  const subtotalWithCharges = subtotal + tax + service;
  const total = getOrderTotal(subtotal, tax, service, deliveryFee, companyFee);

  // Minimum charge calculation for dine-in tables (reactive to cart, tax, service changes)
  const minChargePerGuest = (orderType === "dine_in" && selectedTable?.minimum_charge_enabled) ? (selectedTable.minimum_charge_per_guest || 0) : 0;
  const minChargeGuests = (orderType === "dine_in" && selectedTable?.minimum_charge_enabled) ? (selectedTable.minimum_charge_guests || 0) : 0;
  const minimumChargeTotal = (minChargePerGuest > 0 && minChargeGuests > 0) ? minChargePerGuest * minChargeGuests : 0;
  // remaining = how much more must be ordered to reach minimum (items + tax + service)
  const minimumChargeRemaining = (minimumChargeTotal > 0 && subtotalWithCharges < minimumChargeTotal)
    ? Math.round((minimumChargeTotal - subtotalWithCharges) * 100) / 100
    : 0;
  const minimumChargeAdjustment = (minimumChargeTotal > 0 && total < minimumChargeTotal) ? Math.round((minimumChargeTotal - total) * 100) / 100 : 0;
  const adjustedTotal = total + minimumChargeAdjustment;

  const cashbackLayers = (() => {
    if (!selectedCustomer || adjustedTotal === 0 || !selectedCustomer.loyalty_program_enrolled) return null;
    const layers = []; let currentClient = selectedCustomer; let level = 0;
    while (currentClient && level < 3) {
      const referrer = clients.find(c => c.id === currentClient.referred_by);
      if (!referrer || !referrer.loyalty_program_enrolled) break;
      level++;
      const referrerTier = cashbackTiers.find(t => t.id === referrer.current_tier_id) || cashbackTiers.find(t => t.is_default);
      const cashbackPercentage = referrerTier ? (level === 1 ? referrerTier.cashback_percentage_level1 : level === 2 ? referrerTier.cashback_percentage_level2 : referrerTier.cashback_percentage_level3) || 0 : 0;
      layers.push({ level, referrer, percentage: cashbackPercentage, amount: adjustedTotal * (cashbackPercentage / 100) });
      currentClient = referrer;
    }
    return layers;
  })();

  useEffect(() => {
    if (selectedCustomer?.is_recharge_user && (selectedCustomer.wallet_balance || 0) >= adjustedTotal && adjustedTotal > 0) { setPaymentMethod("recharge_balance"); setSplitPaymentEnabled(false); }
    else if (selectedCustomer?.is_recharge_user && (selectedCustomer.wallet_balance || 0) < adjustedTotal) { setPaymentMethod("cash"); setSplitPaymentEnabled(false); }
  }, [selectedCustomer, adjustedTotal]);
  useEffect(() => {
    if (isDelivery && customerAddresses.length > 0) setSelectedDeliveryAddress(customerAddresses.find(a => a.is_default) || customerAddresses[0]);
    else setSelectedDeliveryAddress(null);
  }, [customerAddresses, isDelivery]);

  usePosVersionGuard(cart, preparedItems, splitCheckOpen, completingPaymentForOrder);

  // Calculate remaining amount for split payment
  const remainingAmount = splitPaymentEnabled && visaAmount ? Math.max(0, adjustedTotal - parseFloat(visaAmount)) : 0;

  const handleCompletePayment = async () => {
    if (!completingPaymentForOrder) return;
    try {
      await base44.entities.Order.update(completingPaymentForOrder.id, {
        status: "paid",
        payment_method: splitPaymentEnabled ? "visa_cash" : paymentMethod,
        visa_amount: splitPaymentEnabled ? parseFloat(visaAmount) : undefined,
        secondary_payment_method: splitPaymentEnabled ? secondaryPaymentMethod : undefined,
        secondary_amount: splitPaymentEnabled ? remainingAmount : undefined,
        discount_amount: manualDiscount,
        global_discount_amount: globalDiscountAmount || 0
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["unpaidSessionOrders"] });
      if (completingPaymentForOrder.voice_order_id) { try { await base44.entities.VoiceOrder.update(completingPaymentForOrder.voice_order_id, { status: "completed" }); queryClient.invalidateQueries({ queryKey: ["voiceOrders"] }); } catch {} } setActiveVoiceOrderId(null); toast.success("Payment completed!");
      setCart([]);
      setCompletingPaymentForOrder(null);
      setSelectedCustomerId("");
      setCustomerSearch("");
      setSelectedDeliveryCompany(null);
      setSelectedDeliveryZone(null);
      setSelectedDeliveryPerson(null);
      setSplitPaymentEnabled(false);
      setVisaAmount("");
      setSecondaryPaymentMethod("cash");
      setCategoryFilter("all");
    } catch (error) {
      toast.error("Failed to complete payment");
    }
  };

  const handleCheckout = async () => {
    if (orderLocked) { warnLocked(); return; }
    if (completingPaymentForOrder) {
      await handleCompletePayment();
      return;
    }
    const success = await handleCheckoutOrder({
      currentSession,
      cart,
      selectedCustomerId,
      selectedCustomer,
      cashbackDiscount,
      paymentMethod,
      orderType,
      selectedTable,
      selectedDeliveryPerson,
      selectedDeliveryZone,
      selectedDeliveryCompany,
      deliveryFee,
      companyFee,
      isProEnabled,
      subtotal,
      tax,
      service,
      manualDiscount,
      manualDiscountPercent,
      manualDiscountFixed,
      manualDiscountMode,
      total: adjustedTotal,
      minimumChargeTotal,
      minimumChargeAdjustment,
      minimumChargePerGuest: minChargePerGuest,
      minimumChargeGuests: minChargeGuests,
      splitPaymentEnabled,
      visaAmount,
      secondaryPaymentMethod,
      remainingAmount,
      receiptUsageType,
      cashbackLayers,
      printers,
      menuItems,
      currentUser,
      clients,
      createOrderMutation,
      updateClientMutation,
      createPurchaseMutation,
      updateTableMutation,
      queryClient,
      selectedBranch,
      selectedBranchId,
      selectedDeliveryAddress,
      deliveryReceiptData,
      voice_order_id: activeVoiceOrderId || null });

    if (success) {
      setCart([]); setPreparedItems([]);
      setCashbackDiscount(0);
      setManualDiscountPercent(0);
      setManualDiscountFixed(0);
      setManualDiscountMode("percentage");
      setIsProEnabled(false);
      setSelectedDeliveryPerson(null);
      setSelectedDeliveryZone(null);
      setSelectedDeliveryCompany(null);
      setSelectedCustomerId("");
      setCustomerSearch("");
      setSelectedTable(null);
      setReceiptUsageType("none");
      setSplitPaymentEnabled(false);
      setVisaAmount("");
      setSecondaryPaymentMethod("cash");
      setCategoryFilter("all"); setActiveVoiceOrderId(null);
    }
  };

  const stockReviewFrozen = isStockReviewActive();
  const getItemsToPrepare = () => {
    // Items in cart that are new or have changed quantity
    const cartChanges = cart.filter(item => {
      const p = preparedItems.find(p => p.id === item.id && JSON.stringify(p.selectedOptions) === JSON.stringify(item.selectedOptions));
      return !p || p.quantity !== item.quantity;
    });
    // Items that were sent to kitchen but have been removed from cart (or quantity decreased)
    const removals = preparedItems.filter(p =>
      !cart.find(c => c.id === p.id && JSON.stringify(c.selectedOptions) === JSON.stringify(p.selectedOptions))
    );
    return [...cartChanges, ...removals];
  };

  const handleSendToKitchen = async () => {
    if (orderLocked) { warnLocked(); return; }
    if (!currentSession) {
      toast.error("No cashier session is open. Please open a session first.");
      return;
    }

    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }

    const itemsToPrepare = getItemsToPrepare();
    if (itemsToPrepare.length === 0) {
      toast.info("All items already sent to kitchen/bar");
      return;
    }

    // Prevent multiple simultaneous submissions
    if (createOrderMutation.isPending) {
      toast.error("Please wait, order is being processed...");
      return;
    }

    try {
      const cairoNow = new Date();
      const orderTime = new Date(cairoNow.getTime() + (2 * 60 * 60 * 1000));
      
      // Always fresh DB query - never use stale cache to prevent duplicate orders
      let existingOrder;
      if (orderType === "dine_in" && selectedTable) {
        const tableOrders = await base44.entities.Order.filter({ table_id: selectedTable.id, order_type: "dine_in" });
        existingOrder = tableOrders
          .filter(o => o.status !== "completed" && o.status !== "cancelled" && o.status !== "paid")
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      } else {
        const allOrders = await base44.entities.Order.filter({ customer_id: selectedCustomerId, order_type: orderType });
        existingOrder = allOrders
          .filter(o => o.status === "preparing" || o.status === "pending")
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      }
      
      if (existingOrder) {
        // Update existing order with all items (mark new/changed as unprepared)
        const updatedItems = cart.map(item => {
          const preparedItem = preparedItems.find(p => 
            p.id === item.id && 
            JSON.stringify(p.selectedOptions) === JSON.stringify(item.selectedOptions)
          );
          return {
            menu_item_id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            selected_options: item.selectedOptions || {},
            option_price_modifier: item.optionPriceModifier || 0,
            optionsWithModifiers: item.optionsWithModifiers || {},
            comment: item.comment || "",
            prepared: preparedItem?.quantity === item.quantity
          };
        });

        await base44.entities.Order.update(existingOrder.id, {
          items: updatedItems,
          subtotal,
          tax,
          service_charge: service,
          discount_amount: manualDiscount,
          global_discount_amount: globalDiscountAmount || 0,
          minimum_charge_per_guest: minChargePerGuest,
          minimum_charge_guests: minChargeGuests,
          minimum_charge_total: minimumChargeTotal,
          minimum_charge_adjustment: minimumChargeAdjustment,
          total: adjustedTotal
        });

        // Build new items array: keep original prepared items + add separate lines for changes
        const newItemsArray = [];
        
        // Add all originally prepared items
        preparedItems.forEach(preparedItem => {
          newItemsArray.push({
            menu_item_id: preparedItem.id,
            name: preparedItem.name,
            price: preparedItem.price,
            quantity: preparedItem.quantity,
            selected_options: preparedItem.selectedOptions || {},
            option_price_modifier: preparedItem.optionPriceModifier || 0,
            optionsWithModifiers: preparedItem.optionsWithModifiers || {},
            comment: preparedItem.comment || "",
            prepared: true,
            isOriginal: true
          });
        });

        // Find additions and quantity increases as separate line items
        cart.forEach(item => {
          const preparedItem = preparedItems.find(p => 
            p.id === item.id && 
            JSON.stringify(p.selectedOptions) === JSON.stringify(item.selectedOptions)
          );
          
          if (!preparedItem) {
            // Brand new item
            newItemsArray.push({
              menu_item_id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              selected_options: item.selectedOptions || {},
              option_price_modifier: item.optionPriceModifier || 0,
              optionsWithModifiers: item.optionsWithModifiers || {},
              comment: item.comment || "",
              prepared: false,
              prep_status: 'new',
              changeType: 'addition'
            });
          } else if (item.quantity > preparedItem.quantity) {
            // Quantity increased - add as separate line
            newItemsArray.push({
              menu_item_id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity - preparedItem.quantity,
              selected_options: item.selectedOptions || {},
              option_price_modifier: item.optionPriceModifier || 0,
              optionsWithModifiers: item.optionsWithModifiers || {},
              comment: item.comment || "",
              prepared: false,
              prep_status: 'new',
              changeType: 'addition'
            });
          }
        });

        // Find removals and quantity decreases as separate line items
        preparedItems.forEach(preparedItem => {
          const currentItem = cart.find(c => 
            c.id === preparedItem.id && 
            JSON.stringify(c.selectedOptions) === JSON.stringify(preparedItem.selectedOptions)
          );
          
          if (!currentItem) {
            // Item completely removed
            newItemsArray.push({
              menu_item_id: preparedItem.id,
              name: preparedItem.name,
              price: preparedItem.price,
              quantity: preparedItem.quantity,
              selected_options: preparedItem.selectedOptions || {},
              option_price_modifier: preparedItem.optionPriceModifier || 0,
              optionsWithModifiers: preparedItem.optionsWithModifiers || {},
              comment: preparedItem.comment || "",
              prepared: false,
              prep_status: 'new',
              changeType: 'removal'
            });
          } else if (currentItem.quantity < preparedItem.quantity) {
            // Quantity decreased - add as separate removal line
            newItemsArray.push({
              menu_item_id: preparedItem.id,
              name: preparedItem.name,
              price: preparedItem.price,
              quantity: preparedItem.quantity - currentItem.quantity,
              selected_options: preparedItem.selectedOptions || {},
              option_price_modifier: preparedItem.optionPriceModifier || 0,
              optionsWithModifiers: preparedItem.optionsWithModifiers || {},
              comment: preparedItem.comment || "",
              prepared: false,
              prep_status: 'new',
              changeType: 'removal'
            });
          }
        });

        // NOTE: newItemsArray is only used for kitchen printing (showing
        // additions/removals as separate lines). The order's items field was
        // already saved correctly above with updatedItems (the actual cart
        // state). Do NOT overwrite it with newItemsArray — that would persist
        // both the original line AND the removal delta, making the receipt
        // show extra items instead of fewer.

        // Collect changes for printing
        const allChanges = newItemsArray.filter(item => item.changeType);

        // Group by preparation station
        const kitchenChanges = allChanges.filter(item => {
          const menuItem = menuItems.find(m => m.id === item.id);
          return menuItem?.preparation_station === 'kitchen';
        });

        const barChanges = allChanges.filter(item => {
          const menuItem = menuItems.find(m => m.id === item.id);
          return menuItem?.preparation_station === 'bar';
        });

        // Print changes to kitchen
        if (kitchenChanges.length > 0) {
          const kitchenPrinter = printers.find(p => p.type === 'kitchen' && p.is_enabled);
          if (kitchenPrinter) {
            await printReceipt(
              {...existingOrder, items: kitchenChanges.map(i => ({
                menu_item_id: i.id,
                name: i.name,
                price: i.price,
                quantity: i.changeType === 'removal' ? i.quantity : (i.changeType === 'update' ? Math.abs(i.quantityChange) : i.quantity),
                changeType: i.changeType,
                quantityChange: i.quantityChange,
                previousQuantity: i.previousQuantity
              }))}, 
              kitchenPrinter, 
              currentUser?.full_name || currentUser?.email, 
              'kitchen', 
              selectedCustomer,
              true
            );
          }
        }

        // Print changes to bar
        if (barChanges.length > 0) {
          const barPrinter = printers.find(p => p.type === 'bar' && p.is_enabled);
          if (barPrinter) {
            await printReceipt(
              {...existingOrder, items: barChanges.map(i => ({
                menu_item_id: i.id,
                name: i.name,
                price: i.price,
                quantity: i.changeType === 'removal' ? i.quantity : (i.changeType === 'update' ? Math.abs(i.quantityChange) : i.quantity),
                changeType: i.changeType,
                quantityChange: i.quantityChange,
                previousQuantity: i.previousQuantity
              }))}, 
              barPrinter, 
              currentUser?.full_name || currentUser?.email, 
              'bar', 
              selectedCustomer,
              true
            );
          }
        }

        if (orderType === "dine_in" && selectedTable) {
          await logOrderChange("order_prepared", "Order", null, null, `${allChanges.length} change(s) sent to kitchen/bar`);
        }
        toast.success("Changes sent to kitchen/bar");
      } else {
        // Create new order in "preparing" status
        const orderData = {
          customer_id: selectedCustomerId,
          customer_name: selectedCustomer.name,
          order_type: orderType,
          table_id: selectedTable?.id,
          table_number: selectedTable?.table_number,
          delivery_person_id: selectedDeliveryPerson?.id,
          delivery_person_name: selectedDeliveryPerson?.name,
          delivery_company_id: selectedDeliveryCompany?.id,
          delivery_company_name: selectedDeliveryCompany?.name,
          delivery_zone_id: selectedDeliveryZone?.id,
          delivery_zone_name: selectedDeliveryZone?.name,
          delivery_fee: deliveryFee,
          is_pro_delivery: !!isProEnabled,
          items: cart.map(c => ({
            menu_item_id: c.id,
            name: c.name,
            price: c.price,
            quantity: c.quantity,
            selected_options: c.selectedOptions || {},
            option_price_modifier: c.optionPriceModifier || 0,
            optionsWithModifiers: c.optionsWithModifiers || {},
            comment: c.comment || "",
            prepared: false,
            prep_status: 'new'
          })),
          subtotal,
          tax,
          service_charge: service,
          discount_amount: manualDiscount,
          manual_discount_percent: manualDiscountPercent,
          manual_discount_fixed: manualDiscountFixed,
          manual_discount_mode: manualDiscountMode,
          global_discount_amount: globalDiscountAmount || 0,
          minimum_charge_per_guest: minChargePerGuest,
          minimum_charge_guests: minChargeGuests,
          minimum_charge_total: minimumChargeTotal,
          minimum_charge_adjustment: minimumChargeAdjustment,
          total: adjustedTotal,
          status: "preparing",
          payment_method: paymentMethod,
          branch_id: selectedBranchId,
          branch_name: selectedBranch?.name,
          voice_order_id: activeVoiceOrderId || null };

        const createdOrder = await createOrderMutation.mutateAsync(orderData);
        await base44.entities.Order.update(createdOrder.id, {
          created_date: orderTime.toISOString()
        });

        // Print to kitchen/bar
        const kitchenItems = cart.filter(item => {
          const menuItem = menuItems.find(m => m.id === item.id);
          return menuItem?.preparation_station === 'kitchen';
        });

        const barItems = cart.filter(item => {
          const menuItem = menuItems.find(m => m.id === item.id);
          return menuItem?.preparation_station === 'bar';
        });

        if (kitchenItems.length > 0) {
          const kitchenPrinter = printers.find(p => p.type === 'kitchen' && p.is_enabled);
          if (kitchenPrinter) {
            await printReceipt({...createdOrder, items: kitchenItems.map(i => ({
              menu_item_id: i.id,
              name: i.name,
              price: i.price,
              quantity: i.quantity
            }))}, kitchenPrinter, currentUser?.full_name || currentUser?.email, 'kitchen', selectedCustomer);
          }
        }

        if (barItems.length > 0) {
          const barPrinter = printers.find(p => p.type === 'bar' && p.is_enabled);
          if (barPrinter) {
            await printReceipt({...createdOrder, items: barItems.map(i => ({
              menu_item_id: i.id,
              name: i.name,
              price: i.price,
              quantity: i.quantity
            }))}, barPrinter, currentUser?.full_name || currentUser?.email, 'bar', selectedCustomer);
          }
          }

          if (orderType === "dine_in" && selectedTable) {
          await logOrderChange("order_prepared", "Order", null, null, "Initial order sent to kitchen/bar");
          }
          toast.success("Order sent to kitchen/bar");
          }

      // Update prepared items list
      setPreparedItems(cart.map(item => ({...item, prepared: true})));
      
      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });

    } catch (error) {
      toast.error("Failed to prepare order");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {isCallCentre && <StagedRoleLanding role="call_centre" onQuickForm={() => setShowCallCenterForm(true)} />}
        {isCaptain && <StagedRoleLanding role="captain" onQuickForm={() => setShowCaptainForm(true)} />}
        {!currentSession && !isCallCentre && !isCaptain && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="p-8 bg-red-50 border-2 border-red-300 rounded-2xl max-w-md w-full space-y-4">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h2 className="text-2xl font-bold text-red-900">No Cashier Session Open</h2>
              <p className="text-red-700">You must open a cashier session before using the POS. Please go to Cashier Management and open a session first.</p>
              <p className="text-sm text-red-500">The POS is locked until a session is active.</p>
            </div>
          </div>
        )}
        {currentSession && !isCallCentre && !isCaptain && (<>
        {stockReviewFrozen && (
          <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Stock Review Freeze Active</p>
              {stockReviewSettings?.stock_review_freeze_reason && (
                <p className="text-sm text-red-800 mt-1">{stockReviewSettings.stock_review_freeze_reason}</p>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <RestaurantLogo className="h-9" />
            <h1 className="text-2xl font-bold">Point of Sale</h1>
          </div>
          <div className="flex items-center gap-2">
            {isModuleEnabled('voice_ordering') && (
            <button onClick={() => setShowVoiceOrders(!showVoiceOrders)} className={`relative px-4 py-2 bg-white border rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-slate-50 ${showVoiceOrders ? "border-purple-400 text-purple-700" : "border-slate-200 text-slate-900"}`}>
              <Mic className="w-4 h-4" />Voice Orders
              {voiceOrders.length > 0 && <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">{voiceOrders.length}</span>}
            </button>
            )}
            {isModuleEnabled('captain_orders') && (
            <button onClick={() => setShowCaptainOrders(!showCaptainOrders)} className={`relative px-4 py-2 bg-white border rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-slate-50 ${showCaptainOrders ? "border-emerald-400 text-emerald-700" : "border-slate-200 text-slate-900"}`}>
              <ClipboardList className="w-4 h-4" />Captain Orders
              {captainOrders.length > 0 && <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">{captainOrders.length}</span>}
            </button>
            )}
            {!isModuleEnabled('call_center') ? null : isCallCentre ? (
              <Button onClick={() => setShowCallCenterForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700"><PhoneCall className="w-4 h-4" />New Call Center Order</Button>
            ) : (
              <button onClick={() => setShowCallCenterOrders(!showCallCenterOrders)} className={`relative px-4 py-2 bg-white border rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-slate-50 ${showCallCenterOrders ? "border-blue-400 text-blue-700" : "border-slate-200 text-slate-900"}`}>
                <PhoneCall className="w-4 h-4" />Call Center Orders
                {callCenterOrders.length > 0 && <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">{callCenterOrders.length}</span>}
              </button>
            )}
            <Button variant="outline" onClick={() => setShowHistory(!showHistory)} className="gap-2" disabled={stockReviewFrozen}><History className="w-4 h-4" />{showHistory ? "New Order" : "Order History"}</Button>
          </div>
        </div>

        {/* Order Type Tabs */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <Button
              variant={orderType === "dine_in" ? "default" : "outline"}
              onClick={() => {
                setOrderType("dine_in");
              }}
              className="gap-2"
              disabled={stockReviewFrozen}
            >
              <UtensilsCrossed className="w-4 h-4" />
              Dine-In {selectedTable && `(Table ${selectedTable.table_number})`}
            </Button>
            {!isCaptain && (
            <>
            {isModuleEnabled('delivery') && (
            <Button
              variant={orderType === "delivery" ? "default" : "outline"}
              onClick={() => {
                setOrderType("delivery");
                setSelectedTable(null);
                setCart([]);
                setSelectedCustomerId("");
                setCustomerSearch("");
                setCashbackDiscount(0);
                setManualDiscountPercent(0);
                setManualDiscountFixed(0);
                setManualDiscountMode("percentage");
                setIsProEnabled(false);
                setSelectedDeliveryPerson(null);
                setSelectedDeliveryZone(null);
                setSelectedDeliveryCompany(null);
                setCategoryFilter("all");
              }}
              className="gap-2"
              disabled={stockReviewFrozen}
            >
              <Truck className="w-4 h-4" />
              Delivery
            </Button>
            )}
            <Button
              variant={orderType === "takeaway" ? "default" : "outline"}
              onClick={() => {
                setOrderType("takeaway");
                setSelectedTable(null);
              }}
              className="gap-2"
              disabled={stockReviewFrozen}
            >
              <ShoppingBag className="w-4 h-4" />
              Takeaway
            </Button>
            </>
            )}
          </div>

          {/* Delivery Receipt Scanner — only for delivery orders with a delivery company selected */}
          {orderType === "delivery" && selectedDeliveryCompany && !showHistory && isModuleEnabled('talabat_receipts') && (
            <div className="flex items-center gap-3">
              <TalabatReceiptUploader
                selectedBranch={selectedBranch}
                selectedBranchId={selectedBranchId}
                deliveryCompanyName={selectedDeliveryCompany?.name || "Delivery"}
                onDataExtracted={(data) => {
                  // Auto-select the client that was created or found
                  if (data.client_id) {
                    setSelectedCustomerId(data.client_id);
                    setCustomerSearch(`${data.client_name || ""} ${data.mobile_number || ""}`.trim());
                  } else if (data.client_name) {
                    setCustomerSearch(`${data.client_name} ${data.mobile_number || ""}`.trim());
                  }
                  // Pre-fill delivery address with QR image for receipt printing
                  if (data.customer_address) {
                    setSelectedDeliveryAddress({
                      id: data.address_id || null,
                      address: data.customer_address,
                      street_address: data.customer_address,
                      qr_code: data.address_qr_code,
                      location_url: data.address_qr_code,
                      qr_code_image_url: data.qr_code_image_url,
                      source: "delivery_receipt",
                      receipt_id: data.receipt_id
                    }); }
                  setDeliveryReceiptData({ receipt_photo_url: data.receipt_photo_url, scanned_payment_method: data.scanned_payment_method, receipt_id: data.receipt_id });
                  if (data.scanned_payment_method === "cash") { setPaymentMethod("cl"); toast.info("Receipt: CASH → CL"); }
                  else if (data.scanned_payment_method === "credit_card") { setPaymentMethod("hospitality"); toast.info("Receipt: CC → Hospitality"); }
                  toast.success("Delivery receipt loaded");
                }}
              />
              <span className="text-xs text-slate-400">Upload a {selectedDeliveryCompany?.name || "delivery"} receipt to auto-extract customer details & payment method</span>
            </div>
          )}

          {/* Paginated Table Selection — 5 per row */}
          {orderType === "dine_in" && !showHistory && (() => {
            const sorted = [...tables].sort((a, b) => (parseInt(String(a.table_number || "").replace(/\D/g, ""), 10) || 0) - (parseInt(String(b.table_number || "").replace(/\D/g, ""), 10) || 0));
            const perPage = 5, totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
            const cp = Math.min(tablePage, totalPages - 1), start = cp * perPage;
            const pageTables = sorted.slice(start, start + perPage);
            const emptySlots = perPage - pageTables.length;
            const onTableClick = (table) => {
              setSelectedTable(table);
              const activeOrder = dineInOrders.find(o => o.table_id === table.id);
              if (activeOrder?.items) {
                const orderItems = activeOrder.items.map((item, i) => ({ id: item.menu_item_id, _cartKey: `${item.menu_item_id}_reg_${i}_${Date.now()}`, name: item.name, price: item.price, quantity: item.quantity, selectedOptions: item.selected_options || {}, optionPriceModifier: item.option_price_modifier || 0, optionsWithModifiers: item.optionsWithModifiers || {}, comment: item.comment || "", prepared: item.prepared || false }));
                setCart(orderItems); setPreviousCart(orderItems); setPreparedItems(orderItems.filter(item => item.prepared)); setSelectedCustomerId(activeOrder.customer_id);
              } else { setCart([]); setPreviousCart([]); setPreparedItems([]); setSelectedCustomerId(""); setCustomerSearch(""); setCashbackDiscount(0); }
            };
            const ChevronUp = () => <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
            const ChevronDown = () => <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;
            return (
              <div className="flex items-center gap-2 pb-2">
                <button onClick={() => setTablePage(Math.max(0, cp - 1))} disabled={cp === 0} className="w-8 h-8 flex-shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"><ChevronUp /></button>
                <div className="grid grid-cols-5 gap-2 flex-1">
                  {pageTables.map(table => {
                    const hasOrder = dineInOrders.some(o => o.table_id === table.id);
                    const isSelected = selectedTable?.id === table.id;
                    return (
                      <button key={table.id} onClick={() => onTableClick(table)} className={`rounded-2xl py-2.5 px-1 font-semibold text-sm transition-all flex flex-col items-center gap-1.5 ${isSelected ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-400 scale-105" : hasOrder ? "bg-green-50 text-green-800 border border-green-300" : "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50"}`}>
                        <span className="truncate">Table {table.table_number}</span>
                        <div className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : hasOrder ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
                      </button>
                    );
                  })}
                  {Array.from({ length: emptySlots }).map((_, i) => <div key={`empty-${i}`} className="rounded-2xl border-2 border-dashed border-slate-200 py-2.5" />)}
                </div>
                <button onClick={() => setTablePage(Math.min(totalPages - 1, cp + 1))} disabled={cp >= totalPages - 1} className="w-8 h-8 flex-shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50"><ChevronDown /></button>
              </div>
            );
          })()}
        </div>

        {/* Section Tabs - Frozen/Sticky */}
        {!showHistory && (
          <div className="sticky top-16 z-40 bg-white shadow-md border-b border-slate-200 pb-4 mb-4 -mx-4 px-4 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {menuSections.map(section => (
                <Button
                  key={section.id}
                  variant={selectedSection === section.id ? "default" : "outline"}
                  onClick={() => {
                    setSelectedSection(section.id);
                    setCategoryFilter("all");
                  }}
                  size="sm"
                  className={selectedSection === section.id ? "bg-amber-500 hover:bg-amber-600" : ""}
                >
                  {section.name}
                </Button>
              ))}
              <Button
                variant={selectedSection === "all" ? "default" : "outline"}
                onClick={() => {
                  setSelectedSection("all");
                  setCategoryFilter("all");
                }}
                size="sm"
                className={selectedSection === "all" ? "bg-amber-500 hover:bg-amber-600" : ""}
              >
                All Menu
              </Button>
            </div>
          </div>
        )}

        {/* Unpaid Orders for current session */}
        {!showHistory && (
          <UnpaidOrdersPanel
            orders={unpaidSessionOrders}
            clients={clients}
            selectedOrderId={completingPaymentForOrder?.id}
            orderType={orderType}
            onSelect={(order) => {
              const orderItems = (order.items || []).map((item, i) => ({
                id: item.menu_item_id,
                _cartKey: `${item.menu_item_id}_reg_${i}_${Date.now()}`,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                selectedOptions: item.selected_options || {},
                optionPriceModifier: item.option_price_modifier || 0,
                optionsWithModifiers: item.optionsWithModifiers || {},
                comment: item.comment || ""
              }));
              setCart(orderItems);
              setSelectedCustomerId(order.customer_id || "");
              if (orderType === "delivery") {
                const company = deliveryCompanies.find(c => c.id === order.delivery_company_id);
                setSelectedDeliveryCompany(company || null);
                const zone = deliveryZones.find(z => z.id === order.delivery_zone_id);
                setSelectedDeliveryZone(zone || null);
                const person = deliveryPersons.find(p => p.id === order.delivery_person_id);
                setSelectedDeliveryPerson(person || null);
              }
              if (orderType === "dine_in" && order.table_id) {
                const table = tables.find(t => t.id === order.table_id);
                setSelectedTable(table || null);
              }
              setCompletingPaymentForOrder(order);
            }}
            onDeselect={() => {
              setCompletingPaymentForOrder(null);
              setCart([]);
              setSelectedCustomerId("");
            }}
          />
        )}

        {/* Voice Orders Pending Review */}
        <VoiceOrdersModal open={showVoiceOrders} onClose={() => setShowVoiceOrders(false)} voiceOrders={voiceOrders} onApproveOrder={(order) => { setActiveVoiceOrderId(order.id); if (order.customer_phone) setCustomerSearch(order.customer_phone); if (order.order_type) setOrderType(order.order_type); setShowVoiceOrders(false); toast.info(`Voice order linked — create the POS order for ${order.customer_name || "customer"}`); }} />

        {/* Website Orders Pending Review (Admin › Modules › Website Packages) */}
        {isModuleEnabled('website_menu') && (
        <WebsiteOrdersPanel
          websiteOrders={websiteOrders}
          deliveryCompanies={deliveryCompanies}
          onLoadOrder={(order) => {
            setOrderType("delivery");
            setSelectedCustomerId(order.customer_id);
            const orderItems = order.items.map((item, i) => ({
              id: item.menu_item_id,
              _cartKey: `${item.menu_item_id}_reg_${i}_${Date.now()}`,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              selectedOptions: item.selected_options || {},
              optionPriceModifier: item.option_price_modifier || 0,
              optionsWithModifiers: item.optionsWithModifiers || {},
              comment: item.comment || ""
            }));
            setCart(orderItems);
            const directCompany = deliveryCompanies.find(dc => dc.delivery_type === "direct");
            setSelectedDeliveryCompany(directCompany || null);
            base44.entities.Order.delete(order.id).then(() => {
              queryClient.invalidateQueries({ queryKey: ["websiteOrders"] });
              toast.success("Order loaded for review. Call customer to confirm!");
            });
          }}
        />
        )}

        {showHistory ? (
          <OrderHistoryView
            orders={orders}
            orderType={orderType}
            printers={printers}
            clients={clients}
            menuItems={menuItems}
            currentUser={currentUser}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["orders"] })}
            onPrint={(order) => {
              setOrderToPrint(order);
              setPrinterDialogOpen(true);
            }}
          />
        ) : (
          /* New Order View */
          <div className="grid lg:grid-cols-12 gap-6">
          {/* Categories Sidebar */}
          <div className={orderType === "dine_in" ? "lg:col-span-2" : "lg:col-span-2"}>
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      categoryFilter === cat
                        ? "bg-amber-500 text-white font-medium" 
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {cat === "all" ? "All Items" : cat}
                  </button>
                ))}
               </CardContent>
            </Card>
          </div>



          {/* Menu Section */}
          <div className="lg:col-span-5 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search menu..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredMenuItems.map(item => (
                <POSMenuItemCard
                  key={item.id}
                  item={item}
                  isFrozen={isItemFrozen(item)}
                  onAdd={addToCart}
                  getItemPrice={getItemPrice}
                />
              ))}
            </div>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-5 space-y-4">
            {/* Customer Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {customerSearch && (
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(customer => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomerId(customer.id);
                            setCustomerSearch("");
                          }}
                          className="w-full text-left p-2 hover:bg-slate-50 rounded"
                        >
                          <p className="font-medium text-sm">{customer.name}</p>
                          <p className="text-xs text-slate-500">{customer.phone}</p>
                        </button>
                      ))
                    ) : (
                      <div className="py-3 text-center">
                        <p className="text-sm text-slate-500 mb-2">Customer not found</p>
                        <Button
                          size="sm"
                          onClick={() => setAddCustomerDialogOpen(true)}
                          className="bg-green-600 hover:bg-green-700 gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add New Customer
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery Selection for Delivery Orders */}
                {orderType === "delivery" && (
                  <DeliverySelectionForm
                    isProEnabled={isProEnabled} setIsProEnabled={setIsProEnabled}
                    selectedDeliveryCompany={selectedDeliveryCompany} setSelectedDeliveryCompany={setSelectedDeliveryCompany}
                    selectedDeliveryZone={selectedDeliveryZone} setSelectedDeliveryZone={setSelectedDeliveryZone}
                    selectedDeliveryPerson={selectedDeliveryPerson} setSelectedDeliveryPerson={setSelectedDeliveryPerson}
                    deliveryCompanies={deliveryCompanies} deliveryZones={deliveryZones} deliveryPersons={deliveryPersons}
                    selectedDeliveryAddress={selectedDeliveryAddress} setSelectedDeliveryAddress={setSelectedDeliveryAddress}
                    customerAddresses={customerAddresses}
                    isDelivery={isDelivery}
                    disabled={!!completingPaymentForOrder}
                  />
                )}

                {selectedCustomer && (
                   <>
                     <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                       <div className="flex-1">
                         <p className="font-medium text-sm">{selectedCustomer.name}</p>
                         <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                         <div className="flex items-center gap-3 mt-1">
                           <p className="text-xs text-slate-600">
                             <span className="font-medium">Cashback:</span> {formatCurrency(selectedCustomer.cashback_earned || 0)}
                           </p>
                           <p className="text-xs text-slate-600">
                             <span className="font-medium">Payout:</span> {formatCurrency(selectedCustomer.available_payout || 0)}
                           </p>
                         </div>
                       </div>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => setSelectedCustomerId("")}
                       >
                         <X className="w-4 h-4" />
                       </Button>
                     </div>
                     {selectedCustomer.welcome_cashback_balance > 0 && (
                       <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                         <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                         <div className="text-xs text-red-700">
                           <p className="font-medium">⏸️ Cannot Process</p>
                           <p>{formatCurrency(selectedCustomer.welcome_cashback_balance)} welcome cashback remaining</p>
                         </div>
                       </div>
                     )}

                     {/* Cashback Redemption for Dine-In */}
                     {orderType === "dine_in" && (
                       <CashbackRedemption 
                         customer={selectedCustomer}
                         total={subtotalWithCharges}
                         onRedeem={(amount) => {
                           setCashbackDiscount(amount);
                           toast.success(`Applied £${amount.toFixed(2)} cashback discount`);
                         }}
                         disabled={!selectedCustomer || cart.length === 0}
                       />
                     )}

                     {/* Cashback Layers Display */}
                     {total > 0 && cashbackLayers && cashbackLayers.length > 0 && (
                       <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                         <p className="text-xs font-semibold text-blue-900">Cashback Distribution:</p>
                         {cashbackLayers.map((layer) => (
                           <div key={layer.level} className="flex items-center justify-between text-xs">
                             <div className="flex items-center gap-1">
                               <Badge variant="outline" className="text-xs font-semibold text-amber-700 border-amber-300 bg-amber-50">
                                 L{layer.level}
                               </Badge>
                               <span className="text-slate-700">{layer.referrer.name}</span>
                             </div>
                             <div className="text-right">
                               <span className="text-slate-600">{layer.percentage}%</span>
                               <span className="ml-1 font-semibold text-blue-700">{formatCurrency(layer.amount)}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </>
                 )}
              </CardContent>
            </Card>

            {/* Cart */}
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Cart ({cart.length})
                  </CardTitle>
                  {orderType === "dine_in" && selectedTable && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600">Table {selectedTable.table_number}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMinChargeDialogOpen(true)}
                        className={`gap-1 h-7 text-xs ${selectedTable.minimum_charge_enabled ? "border-amber-500 text-amber-700 bg-amber-50" : ""}`}
                        title="Set minimum charge for this table"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        {selectedTable.minimum_charge_enabled ? "Min Charge" : "Set Min Charge"}
                      </Button>
                      {orderHistory.length > 0 && (
                        <button
                          onClick={() => setOrderHistoryDialogOpen(true)}
                          className="text-slate-600 hover:text-slate-900 transition-colors"
                          title="View order history"
                        >
                          <HistoryIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {orderType === "dine_in" && selectedTable && cart.length > 0 && (
                  <div className="mt-2">
                    <TableActions 
                      currentTable={selectedTable}
                      cart={cart}
                      onMerge={(sourceTable, items) => {
                        // Add items from source table to current cart
                        items.forEach(item => {
                          const existing = cart.find(c => c.id === item.menu_item_id);
                          if (existing) {
                            setCart(cart.map(c => 
                              c.id === item.menu_item_id 
                                ? {...c, quantity: c.quantity + item.quantity} 
                                : c
                            ));
                          } else {
                            setCart([...cart, {
                              id: item.menu_item_id,
                              name: item.name,
                              price: item.price,
                              quantity: item.quantity
                            }]);
                          }
                        });
                        // Close source table
                        updateTableMutation.mutate({
                          id: sourceTable.id,
                          data: { status: "empty", current_order_id: null }
                        });
                      }}
                      onSeparate={(items) => {
                        // Remove items from current cart
                        setCart(cart.filter(c => !items.find(i => i.menu_item_id === c.id)));
                        toast.info("Items separated. Select a new table to continue.");
                      }}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {orderLocked && <PaidOrderLockNotice />}
                {cart.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">Cart is empty</p>
                ) : (
                  <>
                    {cart.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {cart.map((item, idx) => {
                          const preparedItem = preparedItems.find(p => 
                            p.id === item.id && 
                            JSON.stringify(p.selectedOptions) === JSON.stringify(item.selectedOptions)
                          );
                          const isPrepared = preparedItem && preparedItem.quantity === item.quantity;
                          const isModified = preparedItem && preparedItem.quantity !== item.quantity;
                          const isNew = !preparedItem;

                          let itemBgClass = 'bg-slate-50';
                          let itemBorderClass = '';
                          if (isPrepared) { itemBgClass = 'bg-green-50'; itemBorderClass = 'border border-green-200'; }
                          else if (isModified) { itemBgClass = 'bg-amber-50'; itemBorderClass = 'border border-amber-300'; }
                          else if (isNew) { itemBgClass = 'bg-blue-50'; itemBorderClass = 'border border-blue-200'; }

                          return (
                            <div key={item._cartKey || `${item.id}-${idx}`} className={`flex items-start gap-2 p-2.5 rounded ${itemBgClass} ${itemBorderClass}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm break-words">{item.name}</p>
                                  {orderType === "dine_in" && (
                                    <>
                                      {isPrepared && <Badge className="bg-green-600 text-xs">Sent</Badge>}
                                      {isModified && <Badge className="bg-amber-600 text-xs">Modified</Badge>}
                                      {isNew && <Badge className="bg-blue-600 text-xs">New</Badge>}
                                    </>
                                  )}
                                </div>
                                {item.optionsWithModifiers && Object.keys(item.optionsWithModifiers).length > 0 && (
                                  <div className="text-xs text-slate-500 mt-1 space-y-1">
                                    {Object.entries(item.optionsWithModifiers).map(([optId, optData]) => {
                                      const choices = optData.choices || [];
                                      const optionModifier = optData.totalModifier || 0;
                                      return (
                                        <div key={optId} className="flex justify-between">
                                          <span>{Array.isArray(choices) ? choices.join(", ") : choices}</span>
                                          {optionModifier > 0 && <span className="text-green-700 font-medium">+{formatCurrency(optionModifier * item.quantity)}</span>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <p className="text-xs text-slate-500">{formatCurrency(item.price)}</p>
                                {item.optionPriceModifier > 0 && (
                                 <p className="text-xs text-green-700 font-medium">Options: +{formatCurrency(item.optionPriceModifier * item.quantity)}</p>
                                )}
                                {item.comment && (
                                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                                    <span className="font-semibold text-amber-800">Note: </span>
                                    <span className="text-amber-700 break-words">{item.comment}</span>
                                  </div>
                                )}
                                {editingComment === `${item.id}-${idx}` && (
                                  <div className="mt-1.5 flex flex-col gap-1.5 w-full">
                                    <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add note..." className="h-8 text-xs w-full" autoFocus />
                                    <div className="flex gap-1">
                                      <Button size="sm" onClick={() => { setCart(cart.map((c, i) => i === idx ? {...c, comment: commentText} : c)); setEditingComment(null); setCommentText(""); }} className="h-7 px-2 text-xs flex-1">Save</Button>
                                      <Button size="sm" variant="ghost" onClick={() => { setEditingComment(null); setCommentText(""); }} className="h-7 px-2 text-xs flex-1">Cancel</Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => { if (editingComment === `${item.id}-${idx}`) { setEditingComment(null); setCommentText(""); } else { setEditingComment(`${item.id}-${idx}`); setCommentText(item.comment || ""); } }} className="h-7 w-7 p-0" title={item.comment ? "Edit comment" : "Add comment"}>
                                    <MessageSquare className={`w-3.5 h-3.5 ${item.comment ? 'text-amber-600' : 'text-slate-400'}`} />
                                  </Button>
                                  {item.comment && (
                                    <Button size="sm" variant="ghost" onClick={() => { setCart(cart.map((c, i) => i === idx ? {...c, comment: undefined} : c)); }} className="h-7 w-7 p-0" title="Remove comment">
                                      <X className="w-3.5 h-3.5 text-slate-400" />
                                    </Button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="outline" onClick={() => updateQuantity(item._cartKey, -1)} className="h-7 w-7 p-0"><Minus className="w-3.5 h-3.5" /></Button>
                                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                  <Button size="sm" variant="outline" onClick={() => updateQuantity(item._cartKey, 1)} className="h-7 w-7 p-0"><Plus className="w-3.5 h-3.5" /></Button>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => removeFromCart(item._cartKey)} className="h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {minimumChargeTotal > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
                          <div className="flex justify-between text-sm font-medium text-amber-900">
                            <span>Minimum Charge ({minChargeGuests} × {formatCurrency(minChargePerGuest)})</span>
                            <span>{formatCurrency(minimumChargeTotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-amber-700">
                            <span>Items + Tax + Service</span>
                            <span>{formatCurrency(subtotalWithCharges)}</span>
                          </div>
                          {minimumChargeRemaining > 0 ? (
                            <div className="flex justify-between text-sm font-bold text-amber-900 bg-amber-100 rounded px-2 py-1">
                              <span>Remaining to minimum</span>
                              <span>{formatCurrency(minimumChargeRemaining)}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between text-sm font-bold text-green-700 bg-green-100 rounded px-2 py-1">
                              <span>Minimum reached</span>
                              <span>✓</span>
                            </div>
                          )}
                        </div>
                      )}
                      {shouldApplyService() && servicePercentage > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Service ({(servicePercentage * 100).toFixed(0)}%)</span>
                          <span>{formatCurrency(service)}</span>
                        </div>
                      )}
                      {shouldApplyTax() && taxPercentage > 0 && (
                       <div className="flex justify-between text-sm">
                         <span>Tax ({(taxPercentage * 100).toFixed(0)}%)</span>
                         <span>{formatCurrency(tax)}</span>
                       </div>
                      )}
                      {orderType === "delivery" && (
                      <div className="flex justify-between text-sm">
                        {isProEnabled ? (
                          <>
                            <span>Delivery <Badge className="ml-2 bg-amber-500 text-white text-xs">Pro Free Delivery</Badge></span>
                            <span>{formatCurrency(0)}</span>
                          </>
                        ) : (
                          <>
                            <span>Delivery Fee</span>
                            <span>{formatCurrency(deliveryFee)}</span>
                          </>
                        )}
                      </div>
                      )}
                      {orderType === "delivery" && companyFee > 0 && (
                       <div className="flex justify-between text-sm">
                         <span>Company Fee</span>
                         <span>{formatCurrency(companyFee)}</span>
                       </div>
                      )}
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span>Manual Discount</span>
                              <div className="flex gap-1 ml-auto">
                                <Button
                                  size="sm"
                                  variant={manualDiscountMode === "percentage" ? "default" : "outline"}
                                  onClick={() => { setManualDiscountMode("percentage"); setManualDiscountFixed(0); }}
                                  className="h-7 px-2 text-xs"
                                >
                                  %
                                </Button>
                                <Button
                                  size="sm"
                                  variant={manualDiscountMode === "fixed" ? "default" : "outline"}
                                  onClick={() => { setManualDiscountMode("fixed"); setManualDiscountPercent(0); }}
                                  className="h-7 px-2 text-xs"
                                >
                                  EGP
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm gap-2">
                              <span className="text-xs text-slate-500">{manualDiscountMode === "percentage" ? "Percentage" : "Fixed Amount"}</span>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step={manualDiscountMode === "percentage" ? "1" : "0.01"}
                                  min="0"
                                  max={manualDiscountMode === "percentage" ? 100 : subtotal}
                                  value={manualDiscountMode === "percentage" ? (manualDiscountPercent || "") : (manualDiscountFixed || "")}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (manualDiscountMode === "percentage") {
                                      setManualDiscountPercent(Math.min(100, Math.max(0, val)));
                                    } else {
                                      setManualDiscountFixed(Math.min(subtotal, Math.max(0, val)));
                                    }
                                  }}
                                  placeholder="0"
                                  className="w-24 h-8 text-right text-sm"
                                />
                                <span className="text-xs text-slate-400">{manualDiscountMode === "percentage" ? "%" : "EGP"}</span>
                              </div>
                            </div>
                          </div>
                          {manualDiscount > 0 && (
                            <div className="flex justify-between text-sm text-green-700 font-medium bg-green-50 px-2 py-1 rounded border border-green-200">
                              <span>Manual Discount ({manualDiscountMode === "percentage" ? `${manualDiscountPercent}%` : formatCurrency(manualDiscountFixed)})</span>
                              <span>-{formatCurrency(manualDiscount)}</span>
                            </div>
                          )}
                        </>
                      {cashbackDiscount > 0 && (
                         <div className="flex justify-between text-sm text-green-700 font-medium">
                           <span>Cashback Discount</span>
                           <span>-{formatCurrency(cashbackDiscount)}</span>
                         </div>
                       )}
                      {globalDiscountAmount > 0 && (
                        <div className="flex justify-between text-sm text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded border border-blue-200">
                          <span>💰 Global Discount ({(globalDiscountPercent * 100).toFixed(0)}%)</span>
                          <span>-{formatCurrency(globalDiscountAmount)}</span>
                        </div>
                      )}
                      {minimumChargeAdjustment > 0 && (
                        <>
                          <div className="flex justify-between text-sm text-amber-800 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-300">
                            <span>Minimum Charge ({formatCurrency(minChargePerGuest)} × {minChargeGuests} guests)</span>
                            <span>{formatCurrency(minimumChargeTotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200">
                            <span>Minimum Charge Adjustment</span>
                            <span>+{formatCurrency(minimumChargeAdjustment)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(adjustedTotal)}</span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <PaymentMethodSelector
                      paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                      splitPaymentEnabled={splitPaymentEnabled} setSplitPaymentEnabled={setSplitPaymentEnabled}
                      visaAmount={visaAmount} setVisaAmount={setVisaAmount}
                      secondaryPaymentMethod={secondaryPaymentMethod} setSecondaryPaymentMethod={setSecondaryPaymentMethod}
                      selectedCustomer={selectedCustomer}
                      adjustedTotal={adjustedTotal}
                      total={total}
                      remainingAmount={remainingAmount}
                    />

                    {orderType === "dine_in" && cart.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setSplitCheckOpen(true)}
                        disabled={!currentSession || !selectedCustomerId || stockReviewFrozen}
                        className="w-full gap-2 border-purple-500 text-purple-700 hover:bg-purple-50"
                      >
                        <Users className="w-4 h-4" />
                        Split Check by Guest
                      </Button>
                    )}
                    <div className="flex gap-2 flex-col">
                    <div className="flex gap-3">
                     <Button 
                       className={`flex-1 ${completingPaymentForOrder ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                       onClick={handleCheckout}
                       disabled={
                        !currentSession ||
                        stockReviewFrozen || 
                        createOrderMutation.isPending || 
                        !selectedCustomerId || 
                        (selectedCustomer?.welcome_cashback_balance > 0) ||
                        (splitPaymentEnabled && (!visaAmount || parseFloat(visaAmount) <= 0 || parseFloat(visaAmount) >= adjustedTotal)) ||
                        (!completingPaymentForOrder && orderType === "delivery" && (!selectedDeliveryZone || !selectedDeliveryCompany || 
                          (!selectedDeliveryPerson && !['Talabat', 'Hurry Up', 'Rabbit'].some(thirdParty => selectedDeliveryCompany?.name?.includes(thirdParty)))))
                       }
                     >
                       {!currentSession ? "No Session Open" :
                       createOrderMutation.isPending ? "Processing..." : 
                       completingPaymentForOrder ? `Complete Payment ${splitPaymentEnabled ? `(${formatCurrency(parseFloat(visaAmount || 0))} Visa + ${formatCurrency(remainingAmount)} ${secondaryPaymentMethod})` : formatCurrency(completingPaymentForOrder.total)}` :
                       selectedCustomer?.welcome_cashback_balance > 0 ? "Consume Welcome Cashback First" : 
                       splitPaymentEnabled && (!visaAmount || parseFloat(visaAmount) <= 0) ? "Enter Visa Amount" :
                       splitPaymentEnabled && parseFloat(visaAmount) >= adjustedTotal ? "Visa Amount Too High" :
                       orderType === "delivery" && (!selectedDeliveryZone || !selectedDeliveryCompany) ? "Select Company & Zone" :
                       orderType === "delivery" && !selectedDeliveryPerson && !['Talabat', 'Hurry Up', 'Rabbit'].some(thirdParty => selectedDeliveryCompany?.name?.includes(thirdParty)) ? "Select Delivery Person" :
                       splitPaymentEnabled ? `Pay (${formatCurrency(parseFloat(visaAmount))} Visa + ${formatCurrency(remainingAmount)} ${secondaryPaymentMethod})` :
                       `Pay ${cashbackDiscount > 0 ? `(${formatCurrency(total)} after discount)` : ""}`}
                     </Button>
                    <Button 
                      variant="default"
                      onClick={handleSendToKitchen}
                       disabled={
                         !currentSession ||
                         stockReviewFrozen || 
                         createOrderMutation.isPending || 
                         !selectedCustomerId ||
                         cart.length === 0 ||
                         getItemsToPrepare().length === 0 ||
                         (orderType === "delivery" && (!selectedDeliveryZone || !selectedDeliveryCompany))
                       }
                       className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700"
                     >
                       <Send className="w-4 h-4" />
                        {!currentSession ? "No Session Open" :
                         getItemsToPrepare().length === 0 ? "All Items Sent" :
                         orderType === "dine_in" ? `Send Changes to Kitchen/Bar (${getItemsToPrepare().length})` :
                         `Prepare Order (${getItemsToPrepare().length})`}
                     </Button>
                    </div>
                     {orderType === "dine_in" && selectedTable && canVoidOrders && isManagerRole && (
                       <ForceCloseTableButton
                         table={selectedTable}
                         updateTableMutation={updateTableMutation}
                         queryClient={queryClient}
                         onClosed={() => { setSelectedTable(null); setCart([]); setPreparedItems([]); }}
                       />
                     )}
                    </div>

                    {/* Print Receipt Preview - Only available AFTER order is sent to Kitchen/Bar */}
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        try {
                          // Only print from existing saved order — never from an unsaved cart
                          let orderToUse;
                          if (orderType === "dine_in" && selectedTable) {
                            orderToUse = dineInOrders.find(o => o.table_id === selectedTable.id && o.status !== "completed" && o.status !== "cancelled");
                          } else {
                            // For non-dine-in, look up the existing order by customer + type
                            const allOrders = await base44.entities.Order.filter({ customer_id: selectedCustomerId, order_type: orderType });
                            orderToUse = allOrders
                              .filter(o => o.status === "preparing" || o.status === "pending" || o.status === "ready")
                              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
                          }

                          if (!orderToUse) {
                            toast.error("No saved order found. Send to Kitchen/Bar first.");
                            return;
                          }

                          const cashierPrinter = printers.find(p => p.type === 'cashier' && p.is_enabled);
                          if (cashierPrinter) {
                            await printReceipt(orderToUse, cashierPrinter, currentUser?.full_name || currentUser?.email, 'cashier', selectedCustomer);
                          }

                          toast.success("Receipt printed");
                        } catch (error) {
                          toast.error("Failed to print");
                        }
                      }}
                      disabled={stockReviewFrozen || !selectedCustomerId || cart.length === 0 || preparedItems.length === 0}
                      className="w-full gap-2"
                      title={preparedItems.length === 0 ? "Send order to Kitchen/Bar first before printing receipt" : ""}
                    >
                      <Printer className="w-4 h-4" />
                      {preparedItems.length === 0 ? "Send to Kitchen/Bar First" : "Print Receipt Preview"}
                    </Button>


                  </>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        )}

        </>)}

        <CallCenterOrdersModal
          open={showCallCenterOrders}
          onClose={() => setShowCallCenterOrders(false)}
          orders={callCenterOrders}
          onApproveOrder={(order) => {
            setActiveVoiceOrderId(order.id);
            if (order.order_type) setOrderType(order.order_type);
            const loaded = (order.order_items || []).map((it, i) => ({
              id: it.menu_item_id,
              _cartKey: `${it.menu_item_id}_reg_${i}_${Date.now()}`,
              name: it.name,
              price: it.price || 0,
              quantity: it.quantity || 1,
              selectedOptions: {},
              optionPriceModifier: 0,
              optionsWithModifiers: {},
              comment: it.comment || ""
            }));
            setCart(loaded);
            setPreparedItems([]);
            if (order.customer_phone) setCustomerSearch(order.customer_phone);
            setShowCallCenterOrders(false);
            toast.info(`Call center order loaded for ${order.customer_name || "customer"} — confirm the customer and complete it`);
          }}
        />

        <CaptainOrdersModal
          open={showCaptainOrders}
          onClose={() => setShowCaptainOrders(false)}
          orders={captainOrders}
          onApproveOrder={(order) => {
            setActiveVoiceOrderId(order.id);
            setOrderType("dine_in");
            const table = tables.find(t => String(t.table_number) === String(order.table_number));
            if (table) setSelectedTable(table);
            const loaded = (order.order_items || []).map((it, i) => ({
              id: it.menu_item_id,
              _cartKey: `${it.menu_item_id}_reg_${i}_${Date.now()}`,
              name: it.name,
              price: it.price || 0,
              quantity: it.quantity || 1,
              selectedOptions: {},
              optionPriceModifier: 0,
              optionsWithModifiers: {},
              comment: it.comment || ""
            }));
            setCart(loaded);
            setPreparedItems([]);
            setShowCaptainOrders(false);
            toast.info(`Captain order loaded for Table ${order.table_number || ""} — confirm the customer and complete it`);
          }}
        />

        <CaptainOrderForm
          open={showCaptainForm}
          onClose={() => setShowCaptainForm(false)}
          menuItems={menuItems}
          currentUser={currentUser}
          selectedBranch={selectedBranch}
          selectedBranchId={selectedBranchId}
        />

        <CallCenterOrderForm
          open={showCallCenterForm}
          onClose={() => setShowCallCenterForm(false)}
          menuItems={menuItems}
          currentUser={currentUser}
          selectedBranch={selectedBranch}
          selectedBranchId={selectedBranchId}
        />

        <PrinterSelectDialog
           open={printerDialogOpen}
           onClose={() => {
             setPrinterDialogOpen(false);
             setOrderToPrint(null);
           }}
           printers={printers.filter(p => p.is_enabled)}
           onSelectPrinter={async (printer, printerType) => {
             if (orderToPrint) {
               const customer = clients.find(c => c.id === orderToPrint.customer_id);
               
               // If kitchen or bar type, filter items by preparation station
               let orderToPrintFiltered = orderToPrint;
               if (printerType === "kitchen" || printerType === "bar") {
                 const filteredItems = orderToPrint.items.filter(item => {
                   const menuItem = menuItems.find(m => m.id === item.menu_item_id);
                   return menuItem?.preparation_station === printerType;
                 });
                 orderToPrintFiltered = { ...orderToPrint, items: filteredItems };
               }
               
               await printReceipt(orderToPrintFiltered, printer, currentUser?.full_name || currentUser?.email, printerType, customer);
               toast.success("Receipt sent to printer");
             }
           }}
         />

        <ItemOptionsDialog
          item={selectedItemForOptions}
          open={itemOptionsOpen}
          onClose={() => {
            setItemOptionsOpen(false);
            setSelectedItemForOptions(null);
          }}
          onAdd={handleItemOptionsSubmit}
        />

        <AddCustomerDialog
          open={addCustomerDialogOpen}
          onClose={() => {
            setAddCustomerDialogOpen(false);
          }}
          searchQuery={customerSearch}
          onCustomerAdded={async (customerData) => {
            const newClient = await createClientMutation.mutateAsync({
              name: customerData.name,
              phone: customerData.phone,
              notes: customerData.notes ? `${customerData.notes}${customerData.address ? '\nAddress: ' + customerData.address : ''}` : (customerData.address ? 'Address: ' + customerData.address : ''),
              status: "active",
              referred_by: posClientSettings?.default_pos_client_id || rootClientSettings?.default_root_client_id || null,
              loyalty_program_enrolled: false
            });
            setSelectedCustomerId(newClient.id);
            setCustomerSearch("");
            setAddCustomerDialogOpen(false);
          }}
        />

        <OrderHistoryDialog
          open={orderHistoryDialogOpen}
          onClose={() => setOrderHistoryDialogOpen(false)}
          orderHistory={orderHistory}
          tableName={selectedTable ? `Table ${selectedTable.table_number}` : ""}
        />

        <MinimumChargeDialog
          open={minChargeDialogOpen}
          onClose={() => setMinChargeDialogOpen(false)}
          table={selectedTable}
        />

        <SplitCheckDialog
          open={splitCheckOpen}
          onClose={() => setSplitCheckOpen(false)}
          cart={cart}
          selectedTable={selectedTable}
          selectedCustomer={selectedCustomer}
          selectedCustomerId={selectedCustomerId}
          taxPercentage={taxPercentage}
          servicePercentage={servicePercentage}
          isItemExempt={isItemExempt}
          menuItems={menuItems}
          selectedBranchId={selectedBranchId}
          selectedBranch={selectedBranch}
          currentUser={currentUser}
          manualDiscount={manualDiscount}
          onSplitsComplete={() => {
            setCart([]);
            setPreparedItems([]);
            setManualDiscountPercent(0);
            setManualDiscountFixed(0);
            setManualDiscountMode("percentage");
            setSplitPaymentEnabled(false);
            setVisaAmount("");
            setSecondaryPaymentMethod("cash");
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["tables"] });
            queryClient.invalidateQueries({ queryKey: ["unpaidSessionOrders"] });
            queryClient.invalidateQueries({ queryKey: ["todayOrders"], exact: false });
          }}
        />
        </div>
        </div>
        );
        }