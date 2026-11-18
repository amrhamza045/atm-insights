import { useState, useMemo, useEffect, useRef } from "react";
import { brandName } from "@/lib/brandName";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, UtensilsCrossed, ShoppingCart, Plus, Minus, Trash2, MapPin, Home, Gift, LogIn, Phone, User, AlertCircle, Star, MessageSquare, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { toast } from "sonner";
import AIRecommendations from "../components/menu/AIRecommendations";
import CheckoutUpsell from "../components/menu/CheckoutUpsell";
import StripeCheckout from "../components/payment/StripeCheckout";
import ReviewsDialog from "../components/menu/ReviewsDialog";
import GuestMenuHero from "../components/menu/GuestMenuHero";
import GuestMenuItemCTA from "../components/menu/GuestMenuItemCTA";
import GenMoProgramVideo from "../components/menu/GenMoProgramVideo";
import { usePullToRefresh } from "@/components/hooks/usePullToRefresh";
import VoiceOrderButton from "@/components/voice/VoiceOrderButton";
import { useLanguage } from "@/components/LanguageProvider";

export default function Menu() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [bestSellerItems, setBestSellerItems] = useState([]);
  const [cart, setCart] = useState(() => {
    // Load cart from localStorage on mount
    try {
      const savedCart = localStorage.getItem('menu_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem('order_notes') || "";
  });
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    return localStorage.getItem('selected_address_id') || "";
  });
  const [paymentMethod, setPaymentMethod] = useState(() => {
    return localStorage.getItem('payment_method') || "cash";
  });
  const [paymentReceipt, setPaymentReceipt] = useState(() => {
    return localStorage.getItem('payment_receipt') || null;
  });
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
  const [selectedItemForSize, setSelectedItemForSize] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [selectedItemForOptions, setSelectedItemForOptions] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [stripePaymentSuccess, setStripePaymentSuccess] = useState(false);
  const [reviewsDialogOpen, setReviewsDialogOpen] = useState(false);
  const [selectedItemForReviews, setSelectedItemForReviews] = useState(null);

  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      await queryClient.invalidateQueries({ queryKey: ["recentOrders"] });
      await queryClient.invalidateQueries({ queryKey: ["client"] });
      toast.success("Menu refreshed!");
    } finally {
      setIsRefreshing(false);
    }
  };

  usePullToRefresh(handleRefresh, true);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('menu_cart', JSON.stringify(cart));
  }, [cart]);

  // Save order data to localStorage
  useEffect(() => {
    localStorage.setItem('order_notes', notes);
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('selected_address_id', selectedAddressId);
  }, [selectedAddressId]);

  useEffect(() => {
    localStorage.setItem('payment_method', paymentMethod);
  }, [paymentMethod]);

  useEffect(() => {
    if (paymentReceipt) {
      localStorage.setItem('payment_receipt', paymentReceipt);
    }
  }, [paymentReceipt]);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: client } = useQuery({
    queryKey: ["client", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const clients = await base44.entities.Client.filter({ email: currentUser.email });
      return clients[0] || null;
    },
    enabled: !!currentUser?.email
  });

  const { data: registrationLevel } = useQuery({
    queryKey: ["registrationLevel", client?.registration_level_id],
    queryFn: async () => {
      if (!client?.registration_level_id) return null;
      const levels = await base44.entities.RegistrationLevel.filter({ id: client.registration_level_id });
      return levels[0] || null;
    },
    enabled: !!client?.registration_level_id
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ["addresses", client?.id],
    queryFn: () => base44.entities.Address.filter({ client_id: client.id }),
    enabled: !!client?.id
  });

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list("-created_date")
  });

  const { data: paymentSettings } = useQuery({
    queryKey: ["paymentSettings"],
    queryFn: async () => {
      const settings = await base44.entities.SystemSettings.filter({ setting_key: "payment_numbers" });
      return settings[0] || { 
        instapay_number: "", 
        wallet_number: "",
        stripe_enabled: false,
        stripe_public_key: ""
      };
    }
  });

  const { data: taxSettings } = useQuery({
    queryKey: ["taxSettings"],
    queryFn: async () => {
      const settings = await base44.entities.SystemSettings.filter({ setting_key: "payment_numbers" });
      return settings[0] || { default_tax_percentage: 0, default_service_percentage: 0 };
    }
  });

  const { data: restaurantInfo } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      const info = await base44.entities.RestaurantInfo.list();
      return info[0] || null;
    }
  });

  const { data: menuOptions = [] } = useQuery({
    queryKey: ["menuOptions"],
    queryFn: () => base44.entities.MenuOption.list("sort_order")
  });

  const { data: menuItemOptions = [] } = useQuery({
    queryKey: ["menuItemOptions"],
    queryFn: () => base44.entities.MenuItemOption.list()
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["recentOrders", client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return await base44.entities.Order.filter({ customer_id: client.id }, "-created_date", 10);
    },
    enabled: !!client?.id
  });

  const { data: menuCategories = [] } = useQuery({
    queryKey: ["menuCategories"],
    queryFn: () => base44.entities.MenuCategory.list("sort_order")
  });

  const { data: allMenuSections = [] } = useQuery({
    queryKey: ["menuSections"],
    queryFn: () => base44.entities.MenuSection.list("sort_order")
  });

  const menuSections = allMenuSections.filter(s => s.is_active && s.visible_website !== false);

  const { data: allOrders = [] } = useQuery({
    queryKey: ["allOrders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500)
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ["allReviews"],
    queryFn: async () => {
      const reviews = await base44.entities.Review.list();
      return reviews.filter(r => r.status === "approved");
    }
  });

  const getItemRating = (itemId) => {
    const itemReviews = allReviews.filter(r => r.menu_item_id === itemId);
    if (itemReviews.length === 0) return null;
    const avgRating = itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length;
    return { average: avgRating.toFixed(1), count: itemReviews.length };
  };

  // Calculate best sellers
  useEffect(() => {
    if (allOrders.length > 0 && menuItems.length > 0) {
      const itemCounts = {};
      
      allOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const id = item.menu_item_id;
            if (!itemCounts[id]) {
              itemCounts[id] = 0;
            }
            itemCounts[id] += item.quantity || 1;
          });
        }
      });

      const sortedItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => menuItems.find(item => item.id === id))
        .filter(Boolean);

      setBestSellerItems(sortedItems);
    }
  }, [allOrders, menuItems]);

  // Set default section on mount
  useEffect(() => {
    if (menuSections.length > 0 && selectedSection === "all") {
      const defaultSection = menuSections.find(s => s.is_default && s.is_active);
      if (defaultSection) {
        setSelectedSection(defaultSection.id);
      }
    }
  }, [menuSections]);

  const availableItems = menuItems.filter(item => item.available && item.visible_website !== false);
  
  // Filter categories by selected section and website visibility
  const filteredCategories = useMemo(() => {
    let cats = menuCategories.filter(cat => cat.is_active && cat.visible_website !== false);
    if (selectedSection !== "all") {
      cats = cats.filter(cat => cat.section_id === selectedSection);
    }
    return cats;
  }, [menuCategories, selectedSection]);

  const activeCategoryNames = filteredCategories.map(cat => cat.name);
  const categories = activeCategoryNames.filter(catName => 
    availableItems.some(item => item.category === catName)
  );

  const { data: deliveryCompanies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.entities.DeliveryCompany.list()
  });

  // Get own delivery company
  const directDeliveryCompany = useMemo(() => {
    return deliveryCompanies.find(dc => dc.delivery_type === "direct");
  }, [deliveryCompanies]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      // Create order with "pending" status - cashier will review and submit
      const order = await base44.entities.Order.create({
        ...orderData,
        status: "pending", // Always pending for cashier review
        order_type: "delivery",
        delivery_company_id: directDeliveryCompany?.id || "",
        delivery_company_name: directDeliveryCompany?.name || brandName(),
        delivery_fee: 0, // Cashier will set this
        notes: (orderData.notes || "") + " [Website Order - Awaiting Cashier Review]"
      });
      
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      toast.success("Order submitted! A cashier will contact you shortly to confirm.");
      
      // Clear cart and order data
      setCart([]);
      setNotes("");
      setPaymentMethod("cash");
      setPaymentReceipt(null);
      setCheckoutOpen(false);
      
      // Clear localStorage
      localStorage.removeItem('menu_cart');
      localStorage.removeItem('order_notes');
      localStorage.removeItem('payment_receipt');
    },
    onError: (error) => {
      toast.error("Failed to submit order");
    }
  });

  const getItemOptions = (itemId) => {
    return menuItemOptions
      .filter(io => io.menu_item_id === itemId)
      .map(io => menuOptions.find(o => o.id === io.option_id))
      .filter(Boolean);
  };

  const addToCart = (item) => {
    // If item has sizes, show size selection dialog first
    if (item.sizes && item.sizes.length > 0) {
      setSelectedItemForSize(item);
      setSelectedSize(null);
      setSizeDialogOpen(true);
      return;
    }

    const itemOptions = getItemOptions(item.id);
    
    // If item has options, show options dialog
    if (itemOptions.length > 0) {
      setSelectedItemForOptions(item);
      setSelectedOptions({});
      setOptionsDialogOpen(true);
      return;
    }

    // Otherwise add with default price
    const existingItem = cart.find(cartItem => cartItem.menu_item_id === item.id && !cartItem.size);
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.menu_item_id === item.id && !cartItem.size
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1
      }]);
    }
    toast.success(`${item.name} added to cart`);
  };

  const confirmAddToCartWithOptions = () => {
    if (!selectedItemForOptions) return;

    const item = selectedItemForOptions;
    const selectedSize = item.selectedSize; // Check if size was selected first
    let mandatoryPriceModifier = 0;
    let optionalPriceModifier = 0;
    const mandatoryOptionsList = [];
    const optionalOptionsList = [];
    const optionsDetails = {};

    // Calculate price modifiers from selected options
    Object.entries(selectedOptions).forEach(([optionId, value]) => {
      const option = menuOptions.find(o => o.id === optionId);
      if (option && value) {
        const isMandatory = option.is_mandatory !== false;
        
        if (option.option_type === "multiple_select") {
          // Handle multiple selection with quantities
          const selections = value.split(",").filter(Boolean);
          const optionItems = [];
          selections.forEach(selection => {
            const [label, qty] = selection.split("::");
            const quantity = parseInt(qty) || 1;
            const optionValue = option.values.find(v => v.label === label);
            if (optionValue) {
              const modifier = (optionValue.price_modifier || 0) * quantity;
              if (isMandatory) {
                mandatoryPriceModifier += modifier;
              } else {
                optionalPriceModifier += modifier;
              }
              optionItems.push({ label, quantity, price_modifier: optionValue.price_modifier || 0 });
            }
          });
          if (optionItems.length > 0) {
            const optionText = optionItems.map(i => `${i.quantity}x ${i.label}`).join(", ");
            if (isMandatory) {
              mandatoryOptionsList.push(optionText);
            } else {
              optionalOptionsList.push(`${option.name}: ${optionText}`);
            }
            optionsDetails[optionId] = { name: option.name, items: optionItems, is_mandatory: isMandatory };
          }
        } else {
          // Single select
          const optionValue = option.values.find(v => v.label === value);
          if (optionValue) {
            const modifier = optionValue.price_modifier || 0;
            if (isMandatory) {
              mandatoryPriceModifier += modifier;
              mandatoryOptionsList.push(value);
            } else {
              optionalPriceModifier += modifier;
              optionalOptionsList.push(`${option.name}: ${value}`);
            }
            optionsDetails[optionId] = { name: option.name, value, price_modifier: modifier, is_mandatory: isMandatory };
          }
        }
      }
    });

    // Build combined name with mandatory options
    const baseName = selectedSize ? `${item.name} (${selectedSize.name})` : item.name;
    const combinedName = mandatoryOptionsList.length > 0 ? 
      `${baseName} - ${mandatoryOptionsList.join(", ")}` : baseName;

    // Use size price if size was selected, otherwise use item price
    const basePrice = selectedSize ? selectedSize.price : item.price;
    const mainItemPrice = basePrice + mandatoryPriceModifier;
    const sizeKey = selectedSize ? selectedSize.name : '';
    const allOptionsKey = [...mandatoryOptionsList, ...optionalOptionsList].sort().join("|");
    const cartKey = `${item.id}-${sizeKey}-${allOptionsKey}`;

    const existingItem = cart.find(cartItem => cartItem.cartKey === cartKey);

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.cartKey === cartKey
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      const mainCartItem = {
        menu_item_id: item.id,
        name: combinedName,
        size: selectedSize?.name,
        price: mainItemPrice,
        quantity: 1,
        options: selectedOptions,
        optionsList: [...mandatoryOptionsList, ...optionalOptionsList],
        optionsDetails: optionsDetails,
        cartKey: cartKey
      };

      // Add main item with mandatory options
      const newCart = [...cart, mainCartItem];

      // Add optional options as separate line items if any
      if (optionalOptionsList.length > 0) {
        optionalOptionsList.forEach((optText, idx) => {
          newCart.push({
            menu_item_id: `${item.id}_opt_${idx}`,
            name: optText,
            price: optionalPriceModifier / optionalOptionsList.length,
            quantity: 1,
            cartKey: `${cartKey}_opt_${idx}`,
            isOptionalAddon: true
          });
        });
      }

      setCart(newCart);
    }

    toast.success(`${combinedName} added to cart`);
    setOptionsDialogOpen(false);
    setSelectedItemForOptions(null);
    setSelectedOptions({});
  };

  const confirmAddToCart = (size) => {
    if (!selectedItemForSize) return;
    
    const item = selectedItemForSize;
    
    // Close size dialog
    setSizeDialogOpen(false);
    
    // Check if item has options, if yes, show options dialog next
    const itemOptions = getItemOptions(item.id);
    if (itemOptions.length > 0) {
      setSelectedItemForOptions({ ...item, selectedSize: size });
      setSelectedOptions({});
      setOptionsDialogOpen(true);
      setSelectedItemForSize(null);
      setSelectedSize(null);
      return;
    }
    
    // No options, add directly to cart with selected size
    const sizePrice = size.price;
    const cartKey = `${item.id}-${size.name}`;
    
    const existingItem = cart.find(cartItem => 
      cartItem.menu_item_id === item.id && cartItem.size === size.name
    );
    
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.menu_item_id === item.id && cartItem.size === size.name
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        menu_item_id: item.id,
        name: item.name,
        size: size.name,
        price: sizePrice,
        quantity: 1
      }]);
    }
    
    toast.success(`${item.name} (${size.name}) added to cart`);
    setSelectedItemForSize(null);
    setSelectedSize(null);
  };

  const updateQuantity = (cartKey, change) => {
    setCart(cart.map(item => {
      const itemKey = item.cartKey || `${item.menu_item_id}-${item.size || 'default'}`;
      if (itemKey === cartKey) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (cartKey) => {
    setCart(cart.filter(item => {
      const itemKey = item.cartKey || `${item.menu_item_id}-${item.size || 'default'}`;
      return itemKey !== cartKey;
    }));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate level-based discount
  const levelDiscount = useMemo(() => {
    if (!registrationLevel || cartSubtotal === 0) return 0;
    return (cartSubtotal * (registrationLevel.permanent_discount_percentage || 0)) / 100;
  }, [registrationLevel, cartSubtotal]);

  const deliveryDiscount = useMemo(() => {
    if (!registrationLevel || cartSubtotal === 0) return 0;
    return (cartSubtotal * (registrationLevel.delivery_discount_percentage || 0)) / 100;
  }, [registrationLevel, cartSubtotal]);

  const totalDiscount = levelDiscount + deliveryDiscount;
  const cartTotal = Math.max(0, cartSubtotal - totalDiscount);
  // Website orders: Only tax, NO service charge
  const taxPercentage = (taxSettings?.delivery_tax_percentage || taxSettings?.default_tax_percentage || 0) / 100;
  const tax = cartTotal * taxPercentage;
  const service = 0; // No service charge for website orders
  const totalWithTax = cartTotal + tax;

  const handleCheckout = () => {
    if (!client) {
      toast.error("Please register as a client to place orders");
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    
    const defaultAddress = addresses.find(addr => addr.is_default);
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
    }
    
    setCheckoutOpen(true);
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setPaymentReceipt(result.file_url);
      toast.success("Receipt uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload receipt");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleStripeSuccess = (paymentIntent) => {
    setStripePaymentSuccess(true);
    submitOrderWithStripe(paymentIntent);
  };

  const submitOrderWithStripe = async (paymentIntent) => {
    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    
    const orderData = {
      customer_id: client.id,
      customer_name: client.name,
      customer_phone: client.phone || "",
      delivery_address_id: selectedAddressId,
      delivery_address: selectedAddress ? {
        name: selectedAddress.address_name,
        street: selectedAddress.street_address,
        area: selectedAddress.area,
        city: selectedAddress.city,
        building: selectedAddress.building,
        floor: selectedAddress.floor,
        apartment: selectedAddress.apartment,
        phone: selectedAddress.phone,
        location_url: selectedAddress.location_url,
        notes: selectedAddress.notes
      } : null,
      items: cart,
      subtotal: cartSubtotal,
      discount_amount: totalDiscount,
      tax: tax,
      service_charge: 0,
      total: totalWithTax,
      payment_method: "stripe",
      stripe_payment_intent_id: paymentIntent.id,
      stripe_payment_status: "succeeded",
      notes: notes
    };
    
    createOrderMutation.mutate(orderData);
  };

  const submitOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }
    
    // Stripe payment handled separately
    if (paymentMethod === "stripe") {
      return;
    }

    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    
    const orderData = {
      customer_id: client.id,
      customer_name: client.name,
      customer_phone: client.phone || "",
      delivery_address_id: selectedAddressId,
      delivery_address: selectedAddress ? {
        name: selectedAddress.address_name,
        street: selectedAddress.street_address,
        area: selectedAddress.area,
        city: selectedAddress.city,
        building: selectedAddress.building,
        floor: selectedAddress.floor,
        apartment: selectedAddress.apartment,
        phone: selectedAddress.phone,
        location_url: selectedAddress.location_url,
        notes: selectedAddress.notes
      } : null,
      items: cart,
      subtotal: cartSubtotal,
      discount_amount: totalDiscount,
      tax: tax,
      service_charge: 0,
      total: totalWithTax,
      payment_method: paymentMethod,
      payment_receipt_url: paymentReceipt || "",
      notes: notes
    };
    createOrderMutation.mutate(orderData);
  };

  const filteredItems = useMemo(() => {
    let filtered = availableItems;

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    return filtered;
  }, [availableItems, searchQuery, selectedCategory]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50/20 safe-area-inset-top safe-area-inset-bottom">
      {/* Popup Banners */}
      
      <div className="max-w-7xl mx-auto px-4 py-6">


        {(client && currentUser) && (
          <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border-l-4 border-amber-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl">👋</div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{isAr ? "اهلا" : "Hello"} {client.name?.split(' ')[0] || (isAr ? 'صديقنا' : 'friend')}!</p>
                <p className="text-sm text-slate-600">{isAr ? "اختر من أشهى الأطباق وسلم في البيت 🏠" : "Pick your favorite dishes, delivered to your door 🏠"}</p>
              </div>
            </div>
          </div>
        )}

        {/* GenMo Program Marketing Video */}
        <div className="mb-8">
          <GenMoProgramVideo />
        </div>

        {/* GenMo Cashback Program Banner - Egyptian Market Style */}
         {!client && (
           <Card className="bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 text-white border-none shadow-2xl mb-8 overflow-hidden">
             <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mb-16"></div>
              </div>
              <CardContent className="p-8 relative z-10">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-3xl sm:text-4xl font-bold">{isAr ? "اكسب كاش باك مع كل طلب!" : "Earn Cashback with Every Order!"}</h2>
                  </div>

                 <div className="space-y-2 mt-4 text-sm leading-relaxed">
                   <p className="font-bold">💰 {isAr ? "كاش باك على طلباتك" : "Cashback on your own orders"}</p>
                   <p className="font-bold">👥 {isAr ? "كاش باك على طلبات أصحابك" : "Cashback on your friends' orders"}</p>
                   <p className="font-bold">🌳 {isAr ? "كاش باك من أصحاب أصحابك" : "Cashback from friends of friends"}</p>
                   <p className="text-white/90 pt-2">{isAr ? "ابعت كود الدعوة بتاعك لصحابك. كل صديق يدعو صديق جديد بتكسب منه كمان. ناس أكتر = كاش باك أكتر" : "Share your invite code with friends. Every friend who invites a new friend earns you cashback too. More people = more cashback"}</p>
                 </div>

                 <Button 
                   onClick={() => base44.auth.redirectToLogin()}
                   className="w-full bg-white text-orange-600 hover:bg-gray-100 font-bold mt-4"
                 >
                   {isAr ? "سجل الآن و ابدأ تكسب 🚀" : "Sign Up Now & Start Earning 🚀"}
                 </Button>
               </div>
             </CardContent>
           </Card>
         )}


        {/* Section Tabs - Egyptian Style */}
         <div className="sticky top-16 z-40 bg-white/98 backdrop-blur-sm shadow-lg border-b-4 border-amber-400 pb-3 mb-4 -mx-4 px-4 pt-3">
           <div className="flex gap-2 overflow-x-auto pb-2 whitespace-nowrap scrollbar-hide">
             {menuSections.filter(s => s.is_active).map(section => (
               <Button
                 key={section.id}
                 variant={selectedSection === section.id ? "default" : "outline"}
                 onClick={() => {
                   setSelectedSection(section.id);
                   setSelectedCategory("all");
                 }}
                 className={selectedSection === section.id 
                   ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-md flex-shrink-0" 
                   : "hover:border-amber-400 hover:bg-amber-50 flex-shrink-0"}
               >
                 {section.name}
               </Button>
             ))}
             {client && (
               <Button
                 variant={selectedSection === "ai_recommended" ? "default" : "outline"}
                 onClick={() => {
                   setSelectedSection("ai_recommended");
                   setSelectedCategory("all");
                 }}
                 className={selectedSection === "ai_recommended" 
                   ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-md flex-shrink-0" 
                   : "hover:border-purple-400 hover:bg-purple-50 flex-shrink-0"}
               >
                 ✨ {isAr ? "لك انت" : "For You"}
                 </Button>
             )}
             <Button
               variant={selectedSection === "best_seller" ? "default" : "outline"}
               onClick={() => {
                 setSelectedSection("best_seller");
                 setSelectedCategory("all");
               }}
               className={selectedSection === "best_seller" 
                 ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold shadow-md flex-shrink-0" 
                 : "hover:border-red-400 hover:bg-red-50 flex-shrink-0"}
             >
               🔥 {isAr ? "الأكثر مبيعاً" : "Best Sellers"}
             </Button>
             <Button
               variant={selectedSection === "all" ? "default" : "outline"}
               onClick={() => {
                 setSelectedSection("all");
                 setSelectedCategory("all");
               }}
               className={selectedSection === "all" 
                 ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-md flex-shrink-0" 
                 : "hover:border-amber-400 hover:bg-amber-50 flex-shrink-0"}
             >
               📋 {isAr ? "القائمة الكاملة" : "Full Menu"}
             </Button>
           </div>
         </div>

        {/* AI Recommended Section */}
        {selectedSection === "ai_recommended" && client && (
          <div className="mb-8">
            <AIRecommendations
              client={client}
              menuItems={availableItems}
              recentOrders={recentOrders}
              onAddToCart={addToCart}
              context="menu"
            />
          </div>
        )}

        {/* Delivery Info Section */}
         {selectedSection === "delivery_info" && (
           <div className="mb-8 w-full">
             <h2 className="text-3xl font-bold text-slate-900 mb-6 border-b-2 border-amber-500 pb-2">
               📍 Delivery Zones & Information
             </h2>

             {/* Delivery Zones Grid */}
             <div className="grid md:grid-cols-2 gap-6 mb-8">
               {/* Direct Delivery */}
               <Card className="border-2 border-amber-400 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                 <CardContent className="p-6">
                   <div className="flex items-start gap-3 mb-4">
                     <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
                       🚗
                     </div>
                     <div>
                       <h3 className="font-bold text-lg text-slate-900">{brandName()} Direct Delivery</h3>
                       <p className="text-sm text-slate-600">Fast & Fresh</p>
                     </div>
                   </div>
                   <div className="space-y-3">
                     <p className="text-sm text-slate-700">
                       <strong>Available Areas:</strong> Rehab, New Cairo, All New Cairo Compounds
                     </p>
                     <p className="text-sm text-slate-700">
                       <strong>Delivery Time:</strong> 30-45 minutes
                     </p>
                     <p className="text-sm text-slate-700">
                       <strong>Delivery Fee:</strong> Calculated at checkout
                     </p>
                     <div className="flex flex-col gap-2 pt-2 border-t">
                       <a href="tel:01099003309" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold">
                         <Phone className="w-4 h-4" />
                         01099003309
                       </a>
                       <a href="tel:0226948272" className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold">
                         <Phone className="w-4 h-4" />
                         02-26948272
                       </a>
                     </div>
                   </div>
                 </CardContent>
               </Card>

               {/* Third-Party Delivery */}
               <Card className="border-2 border-slate-200 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                 <CardContent className="p-6">
                   <div className="flex items-start gap-3 mb-4">
                     <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                       🌍
                     </div>
                     <div>
                       <h3 className="font-bold text-lg text-slate-900">Third-Party Delivery</h3>
                       <p className="text-sm text-slate-600">Extended Coverage</p>
                     </div>
                   </div>
                   <div className="space-y-3">
                     <p className="text-sm text-slate-700">
                       <strong>Partners:</strong> Talabat, Uber Eats, Noon, Elmenus
                     </p>
                     <p className="text-sm text-slate-700">
                       <strong>Available Areas:</strong> Cairo (All zones)
                     </p>
                     <p className="text-sm text-slate-700">
                       <strong>Delivery Time:</strong> 45-60 minutes
                     </p>
                     <p className="text-sm text-slate-700">
                       <strong>Note:</strong> Order directly through partner apps
                     </p>
                   </div>
                 </CardContent>
               </Card>
             </div>

             {/* Delivery Banner */}
             <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none shadow-lg mb-6">
               <CardContent className="p-6">
                 <div className="flex items-start gap-3 mb-3">
                   <MapPin className="w-6 h-6 flex-shrink-0 mt-1" />
                   <div>
                     <h3 className="font-bold text-lg mb-2">🚀 We Deliver to Rehab & All New Cairo!</h3>
                     <p className="text-sm text-white/90 leading-relaxed mb-3">
                       Craving delicious food? We're just a call away! Order now and enjoy fresh, hot meals delivered straight to your door.
                     </p>
                     <div className="flex flex-wrap gap-2 items-center">
                       <a href="tel:01099003309" className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors">
                         <Phone className="w-4 h-4" />
                         <span className="font-bold text-sm">01099003309</span>
                       </a>
                       <a href="tel:0226948272" className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors">
                         <Phone className="w-4 h-4" />
                         <span className="font-bold text-sm">02-26948272</span>
                       </a>
                       <span className="text-xs font-semibold animate-pulse">📞 Call Now!</span>
                     </div>
                   </div>
                 </div>
               </CardContent>
             </Card>

            {/* Client Info Verification */}
            {client && currentUser ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <User className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900 mb-2">Verify Your Delivery Information</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        Please review your information below. Make sure everything is correct to ensure smooth delivery.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Name */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">Full Name</p>
                        {client.name ? (
                          <p className="text-base text-slate-900 font-semibold mt-1">{client.name}</p>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <p className="text-sm text-red-600 font-medium">Name not provided</p>
                          </div>
                        )}
                      </div>
                      {!client.name && (
                        <Button asChild size="sm" variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50">
                          <Link to={createPageUrl("MyProfile")}>
                            Add Name
                          </Link>
                        </Button>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">Mobile Number</p>
                        {client.phone ? (
                          <p className="text-base text-slate-900 font-semibold mt-1">{client.phone}</p>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <p className="text-sm text-red-600 font-medium">Phone number not provided</p>
                          </div>
                        )}
                      </div>
                      {!client.phone && (
                        <Button asChild size="sm" variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50">
                          <Link to={createPageUrl("MyProfile")}>
                            Add Phone
                          </Link>
                        </Button>
                      )}
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">Delivery Addresses</p>
                        {addresses && addresses.length > 0 ? (
                          <div className="space-y-2 mt-2">
                            {addresses.map(address => (
                              <div key={address.id} className="bg-white p-3 rounded border">
                                <p className="font-semibold text-slate-900">{address.address_name}</p>
                                <p className="text-sm text-slate-600">{address.street_address}, {address.area}, {address.city}</p>
                                {address.location_url ? (
                                  <a href={address.location_url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    View on Map
                                  </a>
                                ) : (
                                  <div className="flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3 text-orange-500" />
                                    <p className="text-xs text-orange-600">Location link not added</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <p className="text-sm text-red-600 font-medium">No delivery addresses added</p>
                          </div>
                        )}
                      </div>
                      <Button asChild size="sm" variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50">
                        <Link to={createPageUrl("MyProfile")}>
                          {addresses && addresses.length > 0 ? "Edit" : "Add Address"}
                        </Link>
                      </Button>
                    </div>

                    {/* Warning if missing info */}
                    {(!client.name || !client.phone || !addresses || addresses.length === 0) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-900 mb-1">⚠️ Complete Your Profile</p>
                          <p className="text-sm text-amber-800 mb-3">
                            To ensure smooth delivery, please provide all required information in your profile.
                          </p>
                          <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                            <Link to={createPageUrl("MyProfile")}>
                              Complete Profile Now
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6 text-center">
                  <LogIn className="w-12 h-12 mx-auto text-blue-600 mb-3" />
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Login to View Your Delivery Info</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Sign in to manage your delivery addresses and personal information.
                  </p>
                  <Button 
                    onClick={() => base44.auth.redirectToLogin()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Login Now
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Best Seller Section */}
        {selectedSection === "best_seller" && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 mb-6 text-white">
              <p className="text-sm font-bold uppercase opacity-90 mb-1">⭐ {isAr ? "الأكثر طلباً" : "Most Ordered"}</p>
              <h2 className="text-3xl sm:text-4xl font-bold">{isAr ? `أشهر الأطباق في ${brandName()}` : `${brandName()} Most Popular Dishes`}</h2>
              <p className="text-white/90 text-lg mt-2">{isAr ? "الاختيار الأول لآلاف الزبائن 🔥" : "The first choice of thousands of customers 🔥"}</p>
            </div>
            {bestSellerItems.length === 0 ? (
              <Card className="p-12 text-center border-0 shadow-sm">
                <UtensilsCrossed className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="font-medium text-slate-900">No best sellers yet</h3>
                <p className="text-sm text-slate-500 mt-1">Check back after more orders</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 {bestSellerItems.map(item => (
                   <Card key={item.id} className="border-2 border-amber-200 shadow-md hover:shadow-2xl hover:border-orange-400 transition-all overflow-hidden group bg-white">
                     <div className="relative">
                       {item.image_url && (
                         <div className="w-full h-40 rounded-t-xl overflow-hidden flex-shrink-0">
                           <img
                             src={item.image_url}
                             alt={item.name}
                             className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                           />
                           <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm">
                             ⭐ {isAr ? "مشهور" : "Popular"}
                           </div>
                         </div>
                       )}
                       <div className="p-4">
                         <h3 className="font-bold text-slate-900 mb-1 text-lg">{item.name}</h3>
                         {item.description && (
                           <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                             {item.description}
                           </p>
                         )}
                         <div className="flex items-center gap-2 mb-3">
                           <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm py-1">{item.price.toFixed(2)} ج.م</Badge>
                          {item.sizes && item.sizes.length > 0 && (
                            <span className="text-xs text-slate-500">Multiple sizes</span>
                          )}
                        </div>
                        {(client && currentUser) ? (
                          <Button 
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-10 text-sm font-bold text-white shadow-md"
                            onClick={() => addToCart(item)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            {isAr ? "أضف للسلة" : "Add to Cart"}
                          </Button>
                        ) : (
                          <GuestMenuItemCTA />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Content with Sidebar */}
        {selectedSection !== "ai_recommended" && selectedSection !== "best_seller" && selectedSection !== "delivery_info" && (
        <div className="flex gap-6 items-start">
          {/* Left Sidebar */}
          <div className="w-64 shrink-0 sticky top-20 hidden lg:flex flex-col gap-4 ltr:order-1 rtl:order-2">
            {/* Category Filter - Egyptian Style */}
              {categories.length > 0 && (
                <Card className="border-2 border-amber-200 shadow-lg sticky top-32">
                  <CardContent className="p-5">
                    <h3 className="font-bold text-lg mb-4 text-slate-900">🍽️ {isAr ? "الأقسام" : "Categories"}</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${
                          selectedCategory === "all"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                            : "bg-slate-50 hover:bg-amber-50 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {isAr ? "كل الأقسام" : "All Categories"}
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${
                            selectedCategory === cat
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                              : "bg-slate-50 hover:bg-amber-50 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}


          </div>

          {/* Main Menu Content */}
          <div className="flex-1 ltr:order-2 rtl:order-1">
            {/* Search Filter */}
            <Card className="mb-6 border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative min-w-0">
                    <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search menu items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="ltr:pl-10 rtl:pr-10"
                    />
                  </div>
                  {/* Mobile Category Filter */}
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-48 lg:hidden">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <VoiceOrderButton inline />
                </div>
              </CardContent>
            </Card>

            {/* Menu Items */}
            {categories.length === 0 ? (
          <Card className="p-12 text-center border-0 shadow-sm">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-900">No menu items available</h3>
            <p className="text-sm text-slate-500 mt-1">Check back soon for updates</p>
          </Card>
        ) : selectedCategory === "all" ? (
          // Show by categories
          categories.map(category => {
          const categoryItems = filteredItems.filter(item => item.category === category);
          if (categoryItems.length === 0) return null;

          return (
           <div key={category} className="mb-12">
             <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-xl p-4 mb-6">
               <h2 className="text-2xl sm:text-3xl font-bold text-white capitalize">
                 🍽️ {category}
               </h2>
               <p className="text-white/90 text-sm mt-1">{isAr ? "اختر من أشهى الأطباق" : "Choose from our most delicious dishes"}</p>
             </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryItems.map(item => (
                    <Card key={item.id} className="border-2 border-slate-200 shadow-md hover:shadow-xl hover:border-amber-400 transition-all overflow-hidden group bg-white">
                      <div className="relative">
                        {item.image_url && (
                          <div className="w-full h-40 rounded-t-lg overflow-hidden flex-shrink-0">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-bold text-slate-900 mb-1 text-lg">{item.name}</h3>
                          {item.description && (
                            <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold">{item.price.toFixed(2)} ج.م</Badge>
                            {item.sizes && item.sizes.length > 0 && (
                              <span className="text-xs text-slate-500">Multiple sizes</span>
                            )}
                            {getItemRating(item.id) && (
                              <button
                                onClick={() => {
                                  setSelectedItemForReviews(item);
                                  setReviewsDialogOpen(true);
                                }}
                                className="flex items-center gap-1 text-xs text-amber-600 hover:underline"
                              >
                                <Star className="w-3 h-3 fill-amber-400" />
                                {getItemRating(item.id).average} ({getItemRating(item.id).count})
                              </button>
                            )}
                          </div>
                          {(client && currentUser) ? (
                            <div className="flex gap-1">
                              <Button 
                                className="flex-1 bg-amber-500 hover:bg-amber-600 h-10 sm:h-8 text-xs sm:text-xs px-2 sm:px-1"
                                onClick={() => addToCart(item)}
                              >
                                <Plus className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
                                Add to Cart
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => {
                                  setSelectedItemForReviews(item);
                                  setReviewsDialogOpen(true);
                                }}
                              >
                                <MessageSquare className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <GuestMenuItemCTA />
                          )}
                        </div>
                      </div>
                    </Card>
                    ))}
                    </div>
                    </div>
                    );
                    })
                    ) : (
                    // Show filtered results
                    <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-6 capitalize border-b-2 border-amber-500 pb-2">
                    {selectedCategory}
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                    <p className="text-slate-500">No items found matching your search</p>
                    </div>
                    ) : (
                    filteredItems.map(item => (
                    <Card key={item.id} className="border-0 shadow-sm hover:shadow-lg transition-all overflow-hidden group">
                    <div className="flex gap-4 p-4">
                      {item.image_url && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 mb-1 truncate">{item.name}</h3>
                        {item.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className="bg-amber-500 text-white">{item.price.toFixed(2)} EGP</Badge>
                          {item.sizes && item.sizes.length > 0 && (
                            <span className="text-xs text-slate-500">Multiple sizes</span>
                          )}
                          {getItemRating(item.id) && (
                            <button
                              onClick={() => {
                                setSelectedItemForReviews(item);
                                setReviewsDialogOpen(true);
                              }}
                              className="flex items-center gap-1 text-xs text-amber-600 hover:underline"
                            >
                              <Star className="w-3 h-3 fill-amber-400" />
                              {getItemRating(item.id).average} ({getItemRating(item.id).count})
                            </button>
                          )}
                        </div>
                        {(client && currentUser) ? (
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              className="flex-1 bg-amber-500 hover:bg-amber-600 h-8 text-xs"
                              onClick={() => addToCart(item)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add to Cart
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => {
                                setSelectedItemForReviews(item);
                                setReviewsDialogOpen(true);
                              }}
                            >
                              <MessageSquare className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <GuestMenuItemCTA />
                        )}
                      </div>
                    </div>
                    </Card>
                    ))
                    )}
                    </div>
                    </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Options Selection Dialog */}
      <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customize {selectedItemForOptions?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {getItemOptions(selectedItemForOptions?.id)
              .sort((a, b) => {
                const isMandatoryA = a.is_mandatory !== false;
                const isMandatoryB = b.is_mandatory !== false;
                if (isMandatoryA && !isMandatoryB) return -1;
                if (!isMandatoryA && isMandatoryB) return 1;
                return 0;
              })
              .map((option) => (
              <div key={option.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-semibold">
                    {option.name} {option.option_type === "multiple_select" && "(Select multiple)"}
                  </Label>
                  {option.is_mandatory === false && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Optional</span>
                  )}
                </div>
                <div className="space-y-2">
                  {option.values?.map((value) => {
                    const getQuantity = () => {
                      if (option.option_type !== "multiple_select") return 0;
                      const selections = (selectedOptions[option.id] || "").split(",").filter(Boolean);
                      const found = selections.find(s => s.startsWith(value.label + "::"));
                      return found ? parseInt(found.split("::")[1]) || 0 : 0;
                    };
                    const qty = getQuantity();
                    const isSelected = option.option_type === "single_select" 
                      ? selectedOptions[option.id] === value.label
                      : qty > 0;

                    return (
                      <div
                        key={value.label}
                        className={`w-full px-3 py-2 rounded border-2 transition-all ${
                          isSelected
                            ? "border-amber-500 bg-amber-50"
                            : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{value.label}</span>
                          {value.price_modifier !== 0 && (
                            <span className="text-sm text-slate-600">+{value.price_modifier.toFixed(2)} EGP each</span>
                          )}
                        </div>
                        {option.option_type === "single_select" ? (
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            className="w-full mt-2"
                            onClick={() => {
                              setSelectedOptions({ ...selectedOptions, [option.id]: value.label });
                            }}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newQty = Math.max(0, qty - 1);
                                const selections = (selectedOptions[option.id] || "").split(",").filter(Boolean);
                                const filtered = selections.filter(s => !s.startsWith(value.label + "::"));
                                if (newQty > 0) {
                                  filtered.push(`${value.label}::${newQty}`);
                                }
                                setSelectedOptions({
                                  ...selectedOptions,
                                  [option.id]: filtered.join(",")
                                });
                              }}
                              disabled={qty === 0}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{qty}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newQty = qty + 1;
                                const selections = (selectedOptions[option.id] || "").split(",").filter(Boolean);
                                const filtered = selections.filter(s => !s.startsWith(value.label + "::"));
                                filtered.push(`${value.label}::${newQty}`);
                                setSelectedOptions({
                                  ...selectedOptions,
                                  [option.id]: filtered.join(",")
                                });
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setOptionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAddToCartWithOptions}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Add to Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Size Selection Dialog */}
      <Dialog open={sizeDialogOpen} onOpenChange={setSizeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Size for {selectedItemForSize?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedItemForSize?.sizes?.map((size) => (
              <Button
                key={size.name}
                variant={selectedSize?.name === size.name ? "default" : "outline"}
                className="w-full justify-between"
                onClick={() => setSelectedSize(size)}
              >
                <span>{size.name}</span>
                <span className="font-bold">{size.price.toFixed(2)} EGP</span>
              </Button>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setSizeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedSize && confirmAddToCart(selectedSize)}
              disabled={!selectedSize}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Add to Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reviews Dialog */}
      <ReviewsDialog
        menuItem={selectedItemForReviews}
        isOpen={reviewsDialogOpen}
        onClose={() => {
          setReviewsDialogOpen(false);
          setSelectedItemForReviews(null);
        }}
        currentUser={currentUser}
        client={client}
      />

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Your Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Your cart is empty
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map((item) => {
                    const cartKey = item.cartKey || `${item.menu_item_id}-${item.size || 'default'}`;
                    return (
                      <div key={cartKey} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {item.name} {item.size && `(${item.size})`}
                            {item.optionsList?.length > 0 && (
                              <div className="text-xs text-slate-500 mt-1">
                                {item.optionsList.map((opt, idx) => (
                                  <div key={idx}>{opt}</div>
                                ))}
                              </div>
                            )}
                          </h4>
                          <p className="text-sm text-slate-600">{item.price.toFixed(2)} EGP each</p>
                        </div>
                      <div className="flex items-center gap-2">
                        <Button
                           size="icon"
                           variant="outline"
                           className="h-8 w-8"
                           onClick={() => updateQuantity(cartKey, -1)}
                         >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                           size="icon"
                           variant="outline"
                           className="h-8 w-8"
                           onClick={() => updateQuantity(cartKey, 1)}
                         >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="w-20 text-right font-semibold">
                        {(item.price * item.quantity).toFixed(2)} EGP
                      </div>
                      <Button
                         size="icon"
                         variant="ghost"
                         className="h-8 w-8 text-red-500"
                         onClick={() => removeFromCart(cartKey)}
                       >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      </div>
                      );
                      })}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal:</span>
                    <span>{cartSubtotal.toFixed(2)} EGP</span>
                  </div>
                  {levelDiscount > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Member Discount ({registrationLevel?.permanent_discount_percentage}%):</span>
                      <span>-{levelDiscount.toFixed(2)} EGP</span>
                    </div>
                  )}
                  {deliveryDiscount > 0 && (
                    <div className="flex justify-between text-sm text-purple-600">
                      <span>Delivery Discount ({registrationLevel?.delivery_discount_percentage}%):</span>
                      <span>-{deliveryDiscount.toFixed(2)} EGP</span>
                    </div>
                  )}
                  {taxPercentage > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax ({(taxPercentage * 100).toFixed(0)}%):</span>
                      <span>{tax.toFixed(2)} EGP</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{totalWithTax.toFixed(2)} EGP</span>
                  </div>
                </div>

                {/* Upsell Suggestions */}
                <CheckoutUpsell
                  cart={cart}
                  menuItems={availableItems}
                  client={client}
                  onAddToCart={addToCart}
                />

                <div>
                  <Label>Delivery Address*</Label>
                  {addresses.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                      <p className="text-amber-800 mb-2">No delivery addresses found</p>
                      <a 
                        href="/myprofile?tab=addresses" 
                        className="text-amber-600 hover:underline flex items-center gap-1"
                      >
                        <Home className="w-4 h-4" />
                        Add address in your profile
                      </a>
                    </div>
                  ) : (
                    <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery address" />
                      </SelectTrigger>
                      <SelectContent>
                        {addresses.map((address) => (
                          <SelectItem key={address.id} value={address.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{address.address_name}</span>
                              <span className="text-xs text-slate-500">{address.street_address}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900 mb-2">
                    <strong>📞 Order Review Process:</strong>
                  </p>
                  <p className="text-sm text-amber-800">
                    After submitting, a cashier will review your order and <strong>call you at {client?.phone || "your registered number"}</strong> to confirm the final details, payment method, and delivery. You can request changes during the call.
                  </p>
                </div>

                <div>
                  <Label>Preferred Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash on Delivery</SelectItem>
                      <SelectItem value="visa">Visa Card</SelectItem>
                      <SelectItem value="instapay">Instapay</SelectItem>
                      <SelectItem value="wallet">Mobile Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    This is your preferred payment method. The cashier will confirm with you during the call.
                  </p>
                  </div>



                <div>
                  <Label>Order Notes (Optional)</Label>
                  <Textarea
                    placeholder="Any special requests or dietary requirements?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setCheckoutOpen(false)}
                    className="flex-1"
                  >
                    Continue Shopping
                  </Button>
                  <Button 
                    onClick={submitOrder}
                    disabled={createOrderMutation.isPending || !selectedAddressId}
                    className="flex-1 bg-amber-500 hover:bg-amber-600"
                  >
                    {createOrderMutation.isPending ? "Submitting..." : "Submit for Review"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}