import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { sendWhatsApp } from '../../shared/twilioWhatsApp.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // POS / order staff only.
    const denied = await denyUnlessPermitted(base44, user, ['cashier_edit', 'pos_view', 'cashier_view', 'delivery_view']);
    if (denied) return denied;

    const { order_id } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get WhatsApp settings
    const settingsResult = await base44.asServiceRole.entities.SystemSettings.filter({ 
      setting_key: "whatsapp_order_settings" 
    });
    const settings = settingsResult[0];

    if (!settings?.whatsapp_order_confirmation_enabled) {
      return Response.json({ error: 'WhatsApp order confirmations are disabled' }, { status: 400 });
    }

    // Get order details
    const order = await base44.asServiceRole.entities.Order.filter({ id: order_id });
    if (!order[0]) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    const orderData = order[0];

    // Get customer details
    const customer = await base44.asServiceRole.entities.Client.filter({ id: orderData.customer_id });
    if (!customer[0] || !customer[0].phone) {
      return Response.json({ error: 'Customer phone not found' }, { status: 404 });
    }

    const customerData = customer[0];

    // Format currency
    const formatCurrency = (amount) => {
      return `${parseFloat(amount || 0).toFixed(2)} EGP`;
    };

    // Build items list
    const itemsList = orderData.items.map((item, idx) => {
      const itemTotal = (item.price + (item.option_price_modifier || 0)) * item.quantity;
      let itemText = `${idx + 1}. ${item.name}`;
      
      // Add options if any
      if (item.optionsWithModifiers && Object.keys(item.optionsWithModifiers).length > 0) {
        const options = Object.values(item.optionsWithModifiers)
          .map(opt => Array.isArray(opt.choices) ? opt.choices.join(', ') : opt.choices)
          .join(' | ');
        itemText += `\n   ${options}`;
      }
      
      itemText += `\n   ${item.quantity}x × ${formatCurrency(item.price + (item.option_price_modifier || 0))} = ${formatCurrency(itemTotal)}`;
      
      if (item.comment) {
        itemText += `\n   📝 ${item.comment}`;
      }
      
      return itemText;
    }).join('\n\n');

    // Format order date
    const orderDate = new Date(orderData.created_date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Format payment method
    const paymentMethodMap = {
      'cash': 'Cash',
      'visa': 'Visa Card',
      'instapay': 'Instapay',
      'wallet': 'Wallet',
      'cl': 'CL',
      'hospitality': 'Hospitality',
      'recharge_balance': 'Prepaid Balance',
      'visa_cash': 'Visa + Cash',
      'visa_instapay': 'Visa + Instapay'
    };

    // Build message from template
    let message = settings.whatsapp_order_message_template || '';

    // Replace variables
    message = message
      .replace(/\{\{ORDER_NUMBER\}\}/g, orderData.id.slice(0, 8).toUpperCase())
      .replace(/\{\{ORDER_DATE\}\}/g, orderDate)
      .replace(/\{\{CUSTOMER_NAME\}\}/g, customerData.name)
      .replace(/\{\{TABLE_NUMBER\}\}/g, orderData.table_number || 'N/A')
      .replace(/\{\{ORDER_TYPE\}\}/g, orderData.order_type.replace('_', ' ').toUpperCase())
      .replace(/\{\{ITEMS_LIST\}\}/g, itemsList)
      .replace(/\{\{SUBTOTAL\}\}/g, formatCurrency(orderData.subtotal))
      .replace(/\{\{TAX\}\}/g, formatCurrency(orderData.tax))
      .replace(/\{\{SERVICE\}\}/g, formatCurrency(orderData.service_charge))
      .replace(/\{\{DELIVERY_FEE\}\}/g, formatCurrency(orderData.delivery_fee))
      .replace(/\{\{DISCOUNT\}\}/g, formatCurrency((orderData.discount_amount || 0) + (orderData.cashback_used || 0)))
      .replace(/\{\{TOTAL\}\}/g, formatCurrency(orderData.total))
      .replace(/\{\{PAYMENT_METHOD\}\}/g, paymentMethodMap[orderData.payment_method] || orderData.payment_method);

    // Handle conditional sections
    // Service charge conditional
    if ((orderData.service_charge || 0) <= 0) {
      message = message.replace(/\{\{#SERVICE\}\}[\s\S]*?\{\{\/SERVICE\}\}/g, '');
    } else {
      message = message.replace(/\{\{#SERVICE\}\}/g, '').replace(/\{\{\/SERVICE\}\}/g, '');
    }

    // Tax conditional
    if ((orderData.tax || 0) <= 0) {
      message = message.replace(/\{\{#TAX\}\}[\s\S]*?\{\{\/TAX\}\}/g, '');
    } else {
      message = message.replace(/\{\{#TAX\}\}/g, '').replace(/\{\{\/TAX\}\}/g, '');
    }

    // Delivery fee conditional
    if ((orderData.delivery_fee || 0) <= 0) {
      message = message.replace(/\{\{#DELIVERY_FEE\}\}[\s\S]*?\{\{\/DELIVERY_FEE\}\}/g, '');
    } else {
      message = message.replace(/\{\{#DELIVERY_FEE\}\}/g, '').replace(/\{\{\/DELIVERY_FEE\}\}/g, '');
    }

    // Discount conditional
    if (((orderData.discount_amount || 0) + (orderData.cashback_used || 0)) <= 0) {
      message = message.replace(/\{\{#DISCOUNT\}\}[\s\S]*?\{\{\/DISCOUNT\}\}/g, '');
    } else {
      message = message.replace(/\{\{#DISCOUNT\}\}/g, '').replace(/\{\{\/DISCOUNT\}\}/g, '');
    }

    // Send WhatsApp message
    const result = await sendWhatsApp({ phone_number: customerData.phone, message: message.trim() });
    if (!result.ok) return Response.json(result.body, { status: result.status });

    return Response.json({ 
      success: true,
      message_sent: true,
      result: result.body
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});