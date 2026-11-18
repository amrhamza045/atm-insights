import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { printReceipt } from "./ReceiptPrinter";
import { sendOrderWhatsApp } from "./WhatsAppOrderSender";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import issueOrderStock from '@/components/pos/issueOrderStock';

// Global submit lock to prevent double-clicks/double-submissions
let _isSubmitting = false;

export const handleCheckoutOrder = async ({
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
  total,
  minimumChargeTotal,
  minimumChargeAdjustment,
  minimumChargePerGuest,
  minimumChargeGuests,
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
  voice_order_id
}) => {
  // Prevent double-submission
  if (_isSubmitting) {
    toast.error("Order is already being processed, please wait...");
    return false;
  }

  if (!currentSession) {
    toast.error("No cashier session is open. Please open a session first.");
    return false;
  }

  if (cart.length === 0) {
    toast.error("Cart is empty");
    return false;
  }

  if (!selectedCustomerId) {
    toast.error("Please select a customer");
    return false;
  }

  if (selectedCustomer?.welcome_cashback_balance > 0) {
    toast.error(`Cannot submit purchase: Customer has ${formatCurrency(selectedCustomer.welcome_cashback_balance)} welcome cashback balance remaining that must be consumed first`);
    return false;
  }

  if (selectedCustomer?.is_recharge_user && (selectedCustomer.wallet_balance || 0) >= total) {
    if (paymentMethod !== "recharge_balance") {
      toast.error("Recharge users with sufficient balance must pay using recharge balance");
      return false;
    }
  }

  if (paymentMethod === "recharge_balance") {
    if (!selectedCustomer?.is_recharge_user) {
      toast.error("This customer is not a recharge user");
      return false;
    }
    if ((selectedCustomer.wallet_balance || 0) < total) {
      toast.error(`Insufficient recharge balance. Available: ${formatCurrency(selectedCustomer.wallet_balance)}`);
      return false;
    }
  }

  if (splitPaymentEnabled) {
    if (!visaAmount || parseFloat(visaAmount) <= 0) {
      toast.error("Please enter a valid Visa amount");
      return false;
    }
    if (parseFloat(visaAmount) >= total) {
      toast.error("Visa amount must be less than total. Use single payment method instead.");
      return false;
    }
    if (remainingAmount <= 0) {
      toast.error("No remaining amount to pay");
      return false;
    }
  }

  // --- Delivery receipt compliance check ---
  let complianceResult = null;
  if (orderType === "delivery" && selectedDeliveryCompany) {
    try {
      const complianceSettingsResult = await base44.entities.SystemSettings.filter({ setting_key: "compliance_settings" });
      const enforcementMode = complianceSettingsResult[0]?.enforcement_mode || "reporting";

      const scannedPayment = deliveryReceiptData?.scanned_payment_method;
      let expectedPosPayment = null;
      let isCompliant = false;
      let complianceStatus = "pending";

      if (!scannedPayment || scannedPayment === "unknown") {
        complianceStatus = "no_receipt";
      } else {
        expectedPosPayment = scannedPayment === "cash" ? "cl" : scannedPayment === "credit_card" ? "hospitality" : null;
        const actualPayment = splitPaymentEnabled ? `visa_${secondaryPaymentMethod}` : paymentMethod;
        if (expectedPosPayment && actualPayment === expectedPosPayment) {
          isCompliant = true;
          complianceStatus = "compliant";
        } else {
          complianceStatus = "non_compliant";
        }
      }

      complianceResult = { scannedPayment, expectedPosPayment, isCompliant, complianceStatus, enforcementMode };

      // Enforced mode: block checkout on non-compliance
      if (enforcementMode === "enforced" && complianceStatus !== "compliant") {
        if (complianceStatus === "no_receipt") {
          toast.error("⚠️ Receipt required: Please upload a delivery receipt before checkout. (Compliance enforcement is ON)");
        } else {
          toast.error(`⚠️ Payment mismatch: Receipt shows "${scannedPayment}", expected POS payment "${expectedPosPayment}" but selected "${paymentMethod}". (Compliance enforcement is ON)`);
        }
        return false;
      }

      // Reporting mode: warn but allow
      if (enforcementMode === "reporting" && complianceStatus !== "compliant") {
        if (complianceStatus === "no_receipt") {
          toast.warning("⚠️ No receipt uploaded — recorded for compliance reporting");
        } else {
          toast.warning(`⚠️ Payment mismatch — recorded for compliance reporting (receipt: ${scannedPayment} → expected ${expectedPosPayment}, got ${paymentMethod})`);
        }
      }
    } catch (e) {
      console.error("Compliance check failed:", e);
    }
  }

  _isSubmitting = true;
  try {
    // Save the source first; the stock service captures cost evidence before the paid transition.
    const orderTime = new Date();

    // Find any existing open/preparing order for this customer+type to avoid duplicates
    let existingPreparingOrder = null;
    if (orderType === "dine_in" && selectedTable) {
      const tableOrders = await base44.entities.Order.filter({ table_id: selectedTable.id, order_type: "dine_in" });
      existingPreparingOrder = tableOrders
        .filter(o => o.status !== "completed" && o.status !== "cancelled" && o.status !== "paid")
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
    } else {
      const openOrders = await base44.entities.Order.filter({ customer_id: selectedCustomerId, order_type: orderType });
      existingPreparingOrder = openOrders
        .filter(o => o.status === "preparing" || o.status === "pending")
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0] || null;
    }

    const paymentData = {
      items: cart.map(c => ({
        menu_item_id: c.id, name: c.name, price: c.price, quantity: c.quantity,
        selected_options: c.selectedOptions || {}, option_price_modifier: c.optionPriceModifier || 0,
        optionsWithModifiers: c.optionsWithModifiers || {}, comment: c.comment || "",
        selectedSize: c.selectedSize?.name || (typeof c.selectedSize === "string" ? c.selectedSize : null)
      })),
      subtotal, tax, service_charge: service, discount_amount: manualDiscount, manual_discount_percent: manualDiscountPercent, manual_discount_fixed: manualDiscountFixed, manual_discount_mode: manualDiscountMode,
      total,
      delivery_person_id: selectedDeliveryPerson?.id, delivery_person_name: selectedDeliveryPerson?.name,
      delivery_company_id: selectedDeliveryCompany?.id, delivery_company_name: selectedDeliveryCompany?.name,
      delivery_zone_id: selectedDeliveryZone?.id, delivery_zone_name: selectedDeliveryZone?.name,
      delivery_fee: deliveryFee, delivery_company_fee: companyFee, is_pro_delivery: !!isProEnabled,
      delivery_address_id: selectedDeliveryAddress?.id || null,
      delivery_address: selectedDeliveryAddress ? {
        address_name: selectedDeliveryAddress.address_name,
        street_address: selectedDeliveryAddress.street_address,
        address: selectedDeliveryAddress.address,
        city: selectedDeliveryAddress.city,
        area: selectedDeliveryAddress.area,
        building: selectedDeliveryAddress.building,
        floor: selectedDeliveryAddress.floor,
        apartment: selectedDeliveryAddress.apartment,
        phone: selectedDeliveryAddress.phone,
        location_url: selectedDeliveryAddress.location_url,
        qr_code: selectedDeliveryAddress.qr_code,
        qr_code_image_url: selectedDeliveryAddress.qr_code_image_url,
        notes: selectedDeliveryAddress.notes
      } : null,
      status: "pending",
      payment_method: splitPaymentEnabled ? `visa_${secondaryPaymentMethod}` : paymentMethod,
      visa_amount: splitPaymentEnabled ? parseFloat(visaAmount) : undefined,
      secondary_payment_method: splitPaymentEnabled ? secondaryPaymentMethod : undefined,
      secondary_amount: splitPaymentEnabled ? remainingAmount : undefined,
      cashback_used: cashbackDiscount,
      branch_id: selectedBranchId,
      branch_name: selectedBranch?.name,
      minimum_charge_per_guest: minimumChargePerGuest || 0,
      minimum_charge_guests: minimumChargeGuests || 0,
      minimum_charge_total: minimumChargeTotal || 0,
      minimum_charge_adjustment: minimumChargeAdjustment || 0,
      voice_order_id: voice_order_id || null
    };

    if (paymentMethod === "recharge_balance" && selectedCustomer?.is_recharge_user) {
      const balanceBefore = selectedCustomer.wallet_balance || 0;
      const balanceAfter = balanceBefore - total;
      paymentData.recharge_balance_before = balanceBefore;
      paymentData.recharge_balance_deducted = total;
      paymentData.recharge_balance_after = balanceAfter;
      paymentData.consumed_balance_sofar = (selectedCustomer.total_recharged || 0) - balanceAfter;
    }

    let createdOrder;
    if (existingPreparingOrder) {
      // UPDATE the existing preparing order instead of creating a new one
      await base44.entities.Order.update(existingPreparingOrder.id, paymentData);
      createdOrder = { ...existingPreparingOrder, ...paymentData, id: existingPreparingOrder.id };
    } else {
      const orderData = {
        customer_id: selectedCustomerId, customer_name: selectedCustomer.name,
        order_type: orderType, table_id: selectedTable?.id, table_number: selectedTable?.table_number,
        ...paymentData
      };
      createdOrder = await createOrderMutation.mutateAsync(orderData);
    }

    await issueOrderStock(createdOrder.id,cart,menuItems);
    if(cashbackDiscount>0) updateClientMutation.mutate({id:selectedCustomerId,data:{cashback_earned:(selectedCustomer.cashback_earned||0)-cashbackDiscount}});
    if(paymentMethod==='recharge_balance') updateClientMutation.mutate({id:selectedCustomerId,data:{wallet_balance:(selectedCustomer.wallet_balance||0)-total}});
    // Optimistic update for order status
    queryClient.setQueryData(["orders"], (old) => [...(old || []), { ...createdOrder, status: "paid" }]);

    await base44.entities.Order.update(createdOrder.id, { status: "paid" });

    // Mark linked voice order as completed when payment is confirmed
    if (voice_order_id) {
      try {
        await base44.entities.VoiceOrder.update(voice_order_id, { status: "completed" });
        queryClient.invalidateQueries({ queryKey: ["voiceOrders"] });
      } catch (e) { console.error("Failed to complete voice order:", e); }
    }

    // --- Create delivery receipt compliance record ---
    if (complianceResult && orderType === "delivery" && selectedDeliveryCompany) {
      try {
        await base44.entities.DeliveryReceiptCompliance.create({
          order_id: createdOrder.id,
          session_id: currentSession?.id || null,
          branch_id: selectedBranchId,
          branch_name: selectedBranch?.name,
          delivery_company_id: selectedDeliveryCompany?.id,
          delivery_company_name: selectedDeliveryCompany?.name,
          customer_id: selectedCustomerId,
          customer_name: selectedCustomer?.name,
          customer_phone: selectedCustomer?.phone,
          receipt_url: deliveryReceiptData?.receipt_photo_url || null,
          scanned_payment_method: complianceResult.scannedPayment || "unknown",
          pos_payment_method: splitPaymentEnabled ? `visa_${secondaryPaymentMethod}` : paymentMethod,
          expected_pos_payment_method: complianceResult.expectedPosPayment || null,
          is_compliant: complianceResult.isCompliant,
          compliance_status: complianceResult.complianceStatus,
          order_total: total,
          cashier_name: currentUser?.full_name || currentUser?.email,
          report_sent: false
        });
        } catch (e) { console.error("Compliance record creation failed:", e); }
        }

        // --- Audit logging for manual discounts ---
    const auditUser = currentUser?.id || "system";
    const auditEmail = currentUser?.email || "system";

    // Log manual discount if applied
    if (manualDiscount > 0) {
      try {
        await base44.entities.AuditLog.create({
          admin_id: auditUser,
          admin_email: auditEmail,
          action_type: "apply_discount",
          entity_type: "Order",
          entity_id: createdOrder.id,
          entity_name: `Order #${createdOrder.id.slice(0, 8).toUpperCase()}`,
          action_description: `Manual discount applied — ${formatCurrency(manualDiscount)} (${manualDiscountMode === "percentage" ? manualDiscountPercent + "%" : "fixed " + formatCurrency(manualDiscountFixed)})`,
          changes: {
            discount_mode: manualDiscountMode,
            discount_percent: manualDiscountPercent || null,
            discount_fixed: manualDiscountFixed || null,
            discount_amount: manualDiscount
          },
          status: "success"
        });
      } catch (e) { console.error("Audit log failed for manual discount:", e); }
    }

    // Invalidate and refetch cashier orders — use exact:false to match ["todayOrders", sessionId]
    queryClient.invalidateQueries({ queryKey: ["todayOrders"], exact: false });
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ["todayOrders"], exact: false });
    }, 1500);

    await sendOrderWhatsApp(createdOrder.id);

    if (orderType === "dine_in" && selectedTable) {
      await base44.entities.Order.update(createdOrder.id, { status: "completed" }).catch(() => {});

      // Close any other still-open orders on this table so it doesn't stay occupied
      try {
        const tableOrders = await base44.entities.Order.filter({ table_id: selectedTable.id, order_type: "dine_in" });
        await Promise.all(
          tableOrders
            .filter(o => o.id !== createdOrder.id && o.status !== "completed" && o.status !== "cancelled")
            .map(o => base44.entities.Order.update(o.id, { status: "completed" }))
        );
      } catch (e) { console.error("Failed to close table orders:", e); }

      await updateTableMutation.mutateAsync({
        id: selectedTable.id,
        data: { status: "empty", current_order_id: null }
      });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      queryClient.invalidateQueries({ queryKey: ["orders"], exact: false });
      queryClient.refetchQueries({ queryKey: ["orders", "dine_in_status"] });
    }

    try {
      await base44.functions.invoke('sendSMS', {
        recipient_user_id: selectedCustomerId,
        preference_key: 'order_confirmations',
        message: `Order confirmed! Order #${createdOrder.id.slice(0, 8).toUpperCase()} - Total: ${formatCurrency(total)}. Thank you for your order!`
      });
    } catch (error) {
      console.log('SMS notification failed:', error);
    }

    if (orderType === "delivery" && selectedDeliveryPerson) {
      try {
        if (selectedDeliveryPerson.email) {
          await base44.functions.invoke('sendSMS', {
            recipient_email: selectedDeliveryPerson.email,
            preference_key: 'delivery_assignments',
            message: `New delivery assignment! Order #${createdOrder.id.slice(0, 8).toUpperCase()} to ${selectedDeliveryZone?.name}. Customer: ${selectedCustomer.name}`
          });
        }
      } catch (error) {
        console.log('Driver SMS notification failed:', error);
      }
    }

    for (const printer of printers) {
      if (printer.is_enabled && printer.auto_print_on_order) {
        if (printer.type === 'kitchen' || printer.type === 'bar') {
          const hasItemsForPrinter = createdOrder.items.some(item => {
            const menuItem = menuItems.find(m => m.id === item.menu_item_id);
            return menuItem?.preparation_station === printer.type;
          });
          if (hasItemsForPrinter) {
            await printReceipt(createdOrder, printer, currentUser?.full_name || currentUser?.email, printer.type, selectedCustomer);
          }
        } else {
          await printReceipt(createdOrder, printer, currentUser?.full_name || currentUser?.email, printer.type, selectedCustomer);
        }
      }
    }

    const freshClient = (await base44.entities.Client.filter({ id: selectedCustomerId }))[0];

    await updateClientMutation.mutateAsync({
      id: selectedCustomerId,
      data: {
        total_spent: (freshClient?.total_spent || 0) + total,
        visits_count: (freshClient?.visits_count || 0) + 1
      }
    });

    return true;
  } catch (error) {
    toast.error(error.response?.data?.error || error.message || "Failed to process order");
    return false;
  } finally {
    _isSubmitting = false;
  }
};