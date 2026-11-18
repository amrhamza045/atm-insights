import { base44 } from "@/api/base44Client";
import { printReceipt } from "@/components/pos/ReceiptPrinter";

async function getPreparationStations(printers) {
  try {
    const areas = await base44.entities.PreparationArea.list("sort_order");
    const activeAreas = areas.filter(a => a.is_active !== false);
    if (activeAreas.length > 0) {
      return activeAreas.map(a => ({
        key: a.key,
        printerId: a.printer_id,
        header: a.header_text,
        footer: a.footer_text,
        fontSize: a.font_size
      }));
    }
  } catch {}
  // Fallback: derive from printer types
  const types = [...new Set(printers.filter(p => p.type !== "cashier" && p.is_enabled).map(p => p.type))];
  return types.map(t => ({ key: t }));
}

export async function sendToKitchen({
  cart, preparedItems, orderType, selectedTable, selectedCustomerId, selectedCustomer,
  selectedDeliveryPerson, selectedDeliveryZone, selectedDeliveryCompany,
  deliveryFee, subtotal, tax, service, total, paymentMethod,
  dineInOrders, menuItems, printers, currentUser,
  createOrderMutation, queryClient, logOrderChange, setPreparedItems, toast
}) {
  let existingOrder;
  if (orderType === "dine_in" && selectedTable) {
    existingOrder = dineInOrders.find(o => o.table_id === selectedTable.id && o.status !== "completed" && o.status !== "cancelled");
  } else {
    const allOrders = await base44.entities.Order.filter({ 
      customer_id: selectedCustomerId, order_type: orderType, status: "preparing"
    });
    existingOrder = allOrders.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  }

  if (existingOrder) {
    const updatedItems = cart.map(item => {
      const preparedItem = preparedItems.find(p => p.id === item.id && JSON.stringify(p.selectedOptions) === JSON.stringify(item.selectedOptions));
      return {
        menu_item_id: item.id, name: item.name, price: item.price, quantity: item.quantity,
        selected_options: item.selectedOptions || {}, option_price_modifier: item.optionPriceModifier || 0,
        optionsWithModifiers: item.optionsWithModifiers || {}, comment: item.comment || "",
        prepared: preparedItem?.quantity === item.quantity
      };
    });
    await base44.entities.Order.update(existingOrder.id, { items: updatedItems, subtotal, tax, service_charge: service, total });

    const newItemsArray = [];
    preparedItems.forEach(preparedItem => {
      newItemsArray.push({
        menu_item_id: preparedItem.id, name: preparedItem.name, price: preparedItem.price,
        quantity: preparedItem.quantity, selected_options: preparedItem.selectedOptions || {},
        option_price_modifier: preparedItem.optionPriceModifier || 0,
        optionsWithModifiers: preparedItem.optionsWithModifiers || {},
        comment: preparedItem.comment || "", prepared: true, isOriginal: true
      });
    });

    cart.forEach(item => {
      const preparedItem = preparedItems.find(p => p.id === item.id && JSON.stringify(p.selectedOptions) === JSON.stringify(item.selectedOptions));
      if (!preparedItem) {
        newItemsArray.push({ menu_item_id: item.id, name: item.name, price: item.price, quantity: item.quantity,
          selected_options: item.selectedOptions || {}, option_price_modifier: item.optionPriceModifier || 0,
          optionsWithModifiers: item.optionsWithModifiers || {}, comment: item.comment || "",
          prepared: false, prep_status: 'new', changeType: 'addition' });
      } else if (item.quantity > preparedItem.quantity) {
        newItemsArray.push({ menu_item_id: item.id, name: item.name, price: item.price,
          quantity: item.quantity - preparedItem.quantity, selected_options: item.selectedOptions || {},
          option_price_modifier: item.optionPriceModifier || 0, optionsWithModifiers: item.optionsWithModifiers || {},
          comment: item.comment || "", prepared: false, prep_status: 'new', changeType: 'addition' });
      }
    });

    preparedItems.forEach(preparedItem => {
      const currentItem = cart.find(c => c.id === preparedItem.id && JSON.stringify(c.selectedOptions) === JSON.stringify(preparedItem.selectedOptions));
      if (!currentItem) {
        newItemsArray.push({ menu_item_id: preparedItem.id, name: preparedItem.name, price: preparedItem.price,
          quantity: preparedItem.quantity, selected_options: preparedItem.selectedOptions || {},
          option_price_modifier: preparedItem.optionPriceModifier || 0, optionsWithModifiers: preparedItem.optionsWithModifiers || {},
          comment: preparedItem.comment || "", prepared: false, prep_status: 'new', changeType: 'removal' });
      } else if (currentItem.quantity < preparedItem.quantity) {
        newItemsArray.push({ menu_item_id: preparedItem.id, name: preparedItem.name, price: preparedItem.price,
          quantity: preparedItem.quantity - currentItem.quantity, selected_options: preparedItem.selectedOptions || {},
          option_price_modifier: preparedItem.optionPriceModifier || 0, optionsWithModifiers: preparedItem.optionsWithModifiers || {},
          comment: preparedItem.comment || "", prepared: false, prep_status: 'new', changeType: 'removal' });
      }
    });

    await base44.entities.Order.update(existingOrder.id, { items: newItemsArray, subtotal, tax, service_charge: service, total });

    const allChanges = newItemsArray.filter(item => item.changeType);
    const stations = await getPreparationStations(printers);
    for (const station of stations) {
      const stationType = station.key;
      const changes = allChanges.filter(item => menuItems.find(m => m.id === item.menu_item_id || m.id === item.id)?.preparation_station === stationType);
      if (changes.length > 0) {
        const printer = station.printerId
          ? printers.find(p => p.id === station.printerId && p.is_enabled)
          : printers.find(p => p.type === stationType && p.is_enabled);
        if (printer) {
          await printReceipt({...existingOrder, items: changes.map(i => ({
            menu_item_id: i.id || i.menu_item_id, name: i.name, price: i.price,
            quantity: i.changeType === 'removal' ? i.quantity : i.quantity,
            changeType: i.changeType
          }))}, printer, currentUser?.full_name || currentUser?.email, stationType, selectedCustomer, true);
        }
      }
    }

    if (orderType === "dine_in" && selectedTable && logOrderChange) {
      await logOrderChange("order_prepared", "Order", null, null, `${allChanges.length} change(s) sent to preparation`);
    }
    toast.success("Changes sent to preparation");
  } else {
    const orderData = {
      customer_id: selectedCustomerId, customer_name: selectedCustomer.name, order_type: orderType,
      table_id: selectedTable?.id, table_number: selectedTable?.table_number,
      delivery_person_id: selectedDeliveryPerson?.id, delivery_person_name: selectedDeliveryPerson?.name,
      delivery_company_id: selectedDeliveryCompany?.id, delivery_company_name: selectedDeliveryCompany?.name,
      delivery_zone_id: selectedDeliveryZone?.id, delivery_zone_name: selectedDeliveryZone?.name,
      delivery_fee: deliveryFee,
      items: cart.map(c => ({
        menu_item_id: c.id, name: c.name, price: c.price, quantity: c.quantity,
        selected_options: c.selectedOptions || {}, option_price_modifier: c.optionPriceModifier || 0,
        optionsWithModifiers: c.optionsWithModifiers || {}, comment: c.comment || "",
        prepared: false, prep_status: 'new'
      })),
      subtotal, tax, service_charge: service, total, status: "preparing", payment_method: paymentMethod
    };

    const createdOrder = await createOrderMutation.mutateAsync(orderData);

    const stations = await getPreparationStations(printers);
    for (const station of stations) {
      const stationType = station.key;
      const stationItems = cart.filter(item => menuItems.find(m => m.id === item.id)?.preparation_station === stationType);
      if (stationItems.length > 0) {
        const printer = station.printerId
          ? printers.find(p => p.id === station.printerId && p.is_enabled)
          : printers.find(p => p.type === stationType && p.is_enabled);
        if (printer) {
          await printReceipt({...createdOrder, items: stationItems.map(i => ({
            menu_item_id: i.id, name: i.name, price: i.price, quantity: i.quantity
          }))}, printer, currentUser?.full_name || currentUser?.email, stationType, selectedCustomer);
        }
      }
    }

    if (orderType === "dine_in" && selectedTable && logOrderChange) {
      await logOrderChange("order_prepared", "Order", null, null, "Initial order sent to preparation");
    }
    toast.success("Order sent to preparation");
  }

  setPreparedItems(cart.map(item => ({...item, prepared: true})));
  queryClient.invalidateQueries({ queryKey: ["orders"] });
  queryClient.invalidateQueries({ queryKey: ["tables"] });
}