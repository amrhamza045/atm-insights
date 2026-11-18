import { base44 } from "@/api/base44Client";
import { brandName } from "@/lib/brandName";
import { formatCairoReceipt } from "@/components/utils/timezoneHelper";
import { formatCurrency } from "@/components/utils/currencyFormatter";

// Helper to get delivery company commission
async function getDeliveryCompanyCommission(order) {
  if (!order.delivery_company_id || !order.subtotal) return formatCurrency(0);
  try {
    const companies = await base44.entities.DeliveryCompany.filter({ id: order.delivery_company_id });
    const company = companies[0];
    if (!company || !company.commission_percentage) return formatCurrency(0);
    const commission = order.subtotal * (company.commission_percentage / 100);
    return formatCurrency(commission);
  } catch (error) {
    return formatCurrency(0);
  }
}

async function getDeliveryCompanyPercentage(order) {
  if (!order.delivery_company_id) return '';
  try {
    const companies = await base44.entities.DeliveryCompany.filter({ id: order.delivery_company_id });
    const company = companies[0];
    if (!company || !company.commission_percentage) return '';
    return `${company.commission_percentage}%`;
  } catch (error) {
    return '';
  }
}

async function hasDeliveryCompanyCommission(order) {
  if (!order.delivery_company_id) return false;
  try {
    const companies = await base44.entities.DeliveryCompany.filter({ id: order.delivery_company_id });
    const company = companies[0];
    return company && company.commission_percentage && company.commission_percentage > 0;
  } catch (error) {
    return false;
  }
}

export const printReceipt = async (order, printerSettings, cashierName = "Admin", printerType = "cashier", customer = null, isChangeTicket = false) => {
  if (printerSettings?.is_enabled === false) {
    console.log(`Printer not enabled`);
    return;
  }

  const usePrintNode = printerSettings.use_printnode !== false;
  
  if (usePrintNode && printerSettings.name) {
    try {
      const htmlContent = await generateReceiptHTML(order, printerSettings, cashierName, printerType, customer, isChangeTicket);
      const response = await base44.functions.invoke('printNodeSilent', {
        htmlContent,
        printerName: printerSettings.name
      });
      if (response.data.success) {
        console.log('Printed via PrintNode:', response.data.printer);
        return;
      }
    } catch (error) {
      console.warn('PrintNode failed, falling back to browser print:', error);
    }
  }

  const htmlContent = await generateReceiptHTML(order, printerSettings, cashierName, printerType, customer, isChangeTicket);
  
  // Create hidden iframe for printing (avoids popup blockers)
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    // Trigger print after content loads
    iframe.contentWindow.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
  } catch (error) {
    console.error('Print failed:', error);
    alert("Print dialog could not open. Please check if pop-ups are blocked.");
    document.body.removeChild(iframe);
  }
};

async function getQRCodeDataURI(text) {
  try {
    const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(text)}`);
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}

async function generateReceiptHTML(order, _printerSettings, cashierName, printerType, customer = null, isChangeTicket = false) {
  let customerPhone = order.customer_phone || "";
  let fallbackAddress = null;
  if (order.customer_id) {
    const client = await base44.entities.Client.filter({ id: order.customer_id });
    if (client && client[0]) {
      customerPhone = customerPhone || client[0].phone || "";
    }
    // If the order doesn't have a delivery_address snapshot, fetch the client's
    // most relevant Address record (default first) so the QR image and address
    // text still appear on the printed receipt.
    if (!order.delivery_address) {
      try {
        const addresses = await base44.entities.Address.filter({ client_id: order.customer_id });
        if (addresses.length > 0) {
          fallbackAddress = addresses.find(a => a.is_default) || addresses[0];
        }
      } catch (e) {
        console.error("Fallback address fetch error:", e);
      }
    }
  }

  // Fetch branch info as fallback for printer settings
  let branch = null;
  if (order.branch_id) {
    try {
      const branches = await base44.entities.Branch.filter({ id: order.branch_id });
      branch = branches[0] || null;
    } catch (e) {}
  }
  const b = branch || {};
  const printerSettings = {
    ..._printerSettings,
    restaurant_logo_url: _printerSettings?.restaurant_logo_url || b.restaurant_logo_url,
    receipt_header: _printerSettings?.receipt_header || b.receipt_header,
    receipt_footer: _printerSettings?.receipt_footer || b.receipt_footer,
    restaurant_address: _printerSettings?.restaurant_address || b.address,
    restaurant_phone: _printerSettings?.restaurant_phone || b.landline,
    restaurant_whatsapp: _printerSettings?.restaurant_whatsapp || b.whatsapp,
    restaurant_hotline: _printerSettings?.restaurant_hotline || b.hotline,
    restaurant_website: _printerSettings?.restaurant_website || b.website,
    commercial_registration: _printerSettings?.commercial_registration || b.commercial_registration,
    tax_card: _printerSettings?.tax_card || b.tax_card,
  };

  const receiptWidth = printerSettings.receipt_width || 80;
  const fontSize = printerSettings.font_size || 12;
  const fontName = printerSettings.font_name || "Consolas";
  
  const qrDataURI = printerType === "cashier" ? await getQRCodeDataURI(`${window.location.origin}/Register`) : null;

  const charWidth = Math.floor(receiptWidth / 2.5);
  const line = "=".repeat(charWidth);

  const formatLine = (left, right = "", char = " ") => {
    const padding = charWidth - left.length - right.length;
    if (padding <= 0) return left + right;
    return left + char.repeat(padding) + right;
  };

  let receipt = [];
  let addressEndIndex = -1; // split point for inserting delivery QR right after address

  const showLogo = printerSettings.restaurant_logo_url;
  
  const headerHtml = (printerSettings.receipt_header && printerType === "cashier") ? `
    <table style="width: 100%; border-collapse: collapse; margin: 1px 0;">
      <tr>
        <td style="text-align: left; vertical-align: middle; font-weight: bold; font-size: ${fontSize}px; width: 35%; padding: 1px;">${brandName()} GenMo</td>
        <td style="text-align: center; vertical-align: middle; width: 30%; padding: 1px;">
          ${qrDataURI ? `<img src="${qrDataURI}" style="width: 14mm; height: 14mm; display: block; margin: 0 auto;" alt="Register QR" />` : ''}
        </td>
        <td style="text-align: left; vertical-align: middle; width: 35%; padding: 1px; font-size: ${fontSize - 3}px;">
          <div>Scan to Register</div>
          <div style="font-weight: bold; white-space: nowrap;">${brandName()}</div>
        </td>
      </tr>
    </table>
    <div style="border-top: 1px solid #000; margin: 2px 0;"></div>
  ` : '';
  if (printerSettings.receipt_header && printerType === "cashier") {
    receipt.push(line);
  }

  if (printerType === "kitchen") {
    receipt.push(isChangeTicket ? "=== ORDER MODIFICATION ===" : "=== KITCHEN ORDER ===");
    receipt.push(line);
  } else if (printerType === "bar") {
    receipt.push(isChangeTicket ? "=== ORDER MODIFICATION ===" : "=== BAR ORDER ===");
    receipt.push(line);
  }

  if (printerSettings.show_date_time) {
    const formattedDate = formatCairoReceipt(order.created_date);
    receipt.push(formatLine("Date:", formattedDate));
  }
  if (printerSettings.show_cashier) {
    receipt.push(formatLine("Cashier:", cashierName));
  }
  if (printerSettings.show_table_number && order.table_number) {
    receipt.push(formatLine("Table:", order.table_number));
  }
  if (printerSettings.show_customer_name && order.customer_name) {
    receipt.push(formatLine("Customer:", order.customer_name));
  }

  if (printerType === "cashier") {
    receipt.push(formatLine("Phone:", customerPhone));
    
    const addr = order.delivery_address || fallbackAddress || {};
    const addressParts = [];
    if (order.delivery_zone_name) addressParts.push(order.delivery_zone_name);
    if (addr.address_name) addressParts.push(addr.address_name);
    if (addr.address) addressParts.push(addr.address);
    if (addr.street_address) addressParts.push(addr.street_address);
    if (addr.area) addressParts.push(addr.area);
    if (addr.city) addressParts.push(addr.city);
    if (addr.building) addressParts.push(`Bldg: ${addr.building}`);
    if (addr.floor) addressParts.push(`Fl: ${addr.floor}`);
    if (addr.apartment) addressParts.push(`Apt: ${addr.apartment}`);
    if (addr.notes) addressParts.push(`Remarks: ${addr.notes}`);
    const fullAddress = addressParts.join(", ") || "";
    receipt.push(`Address: ${fullAddress}`);
    addressEndIndex = receipt.length; // QR image will be inserted right after this
  }

  receipt.push(line);

  // Items table header (cashier only)
  if (printerType === "cashier") {
    const qtyW = 3; const priceW = 7; const totalW = 7;
    const descW = charWidth - qtyW - priceW - totalW - 4;
    receipt.push(`${"QTY".padEnd(qtyW)} ${"ITEM".padEnd(descW)} ${"PRICE".padStart(priceW)} ${"TOTAL".padStart(totalW)}`);
    receipt.push(line);
  }

  // Filter items for kitchen/bar
  let itemsToShow = order.items || [];
  if (printerType === "kitchen" || printerType === "bar") {
    const filteredItems = [];
    for (const item of itemsToShow) {
      try {
        const menuItems = await base44.entities.MenuItem.filter({ id: item.menu_item_id });
        const menuItem = menuItems[0];
        if (menuItem?.preparation_station === printerType) {
          filteredItems.push(item);
        }
      } catch (e) {
        console.error("Error fetching menu item:", e);
      }
    }
    itemsToShow = filteredItems;
  }

  // Helper: render one cashier item line
  const renderCashierItem = (item, isFree = false) => {
    const qtyW = 3; const priceW = 7; const totalW = 7;
    const descW = charWidth - qtyW - priceW - totalW - 4;
    const itemName = (item.name?.replace(/\n/g, ' - ') || item.name || "");
    const originalPrice = item.price + (item.option_price_modifier || 0);
    const itemPrice = originalPrice;
    const itemTotal = itemPrice * item.quantity;
    const priceStr = isFree ? " FREE" : formatCurrency(itemPrice, false);
    const totalStr = isFree ? " FREE" : formatCurrency(itemTotal, false);

    const firstPart = itemName.substring(0, descW);
    receipt.push(`${String(item.quantity).padEnd(qtyW)} ${firstPart.padEnd(descW)} ${priceStr.padStart(priceW)} ${totalStr.padStart(totalW)}`);

    let remaining = itemName.substring(descW);
    while (remaining.length > 0) {
      const chunk = remaining.substring(0, descW);
      receipt.push(`${" ".repeat(qtyW)} ${chunk.padEnd(descW)} ${" ".repeat(priceW)} ${" ".repeat(totalW)}`);
      remaining = remaining.substring(descW);
    }
  };

  if (printerType === "cashier") {
    itemsToShow.forEach(item => renderCashierItem(item));

  } else {
    // Kitchen / Bar
    itemsToShow.forEach(item => {
      const itemName = item.name?.replace(/\n/g, ' - ') || item.name;
      let prefix = '';
      if (isChangeTicket && item.changeType) {
        if (item.changeType === 'addition') prefix = '+ ADD: ';
        else if (item.changeType === 'removal') prefix = '- REMOVE: ';
        else if (item.changeType === 'update') prefix = item.quantityChange > 0 ? `+ INCREASE (was ${item.previousQuantity}): ` : `- DECREASE (was ${item.previousQuantity}): `;
      }
      receipt.push(`${prefix}${item.quantity}x ${itemName}`);
    });
  }

  receipt.push(line);

  // Totals section
  let totalsHtml = '';
  if (printerType === "cashier") {
    // (rendered as HTML below)
  } else {
    receipt.push(line);
    receipt.push(`Prepared at: ${formatCairoReceipt(new Date()).split(' ').slice(-1)[0]}`);
  }

  // Delivery QR code image block (cashier receipts for delivery orders)
  let deliveryQrHtml = '';
  if (printerType === "cashier" && order.order_type === "delivery" && (order.delivery_address || fallbackAddress)) {
    const addr = order.delivery_address || fallbackAddress;
    const qrImageUrl = addr.qr_code_image_url;
    const locationUrl = addr.location_url || addr.qr_code;
    if (qrImageUrl) {
      deliveryQrHtml = `
        <div style="text-align: center; margin: 6px 0;">
          <div style="display: inline-block; padding: 3mm; background: #ffffff; border: 1px solid #000;">
            <img src="${qrImageUrl}" style="width: 40mm; height: 40mm; display: block; margin: 0 auto; image-rendering: pixelated; image-rendering: crisp-edges; filter: contrast(1.5) brightness(1.1);" alt="Delivery Location QR" />
          </div>
          <div style="font-size: ${fontSize - 3}px; margin-top: 4px; color: #000; font-weight: bold;">Scan for delivery location</div>
        </div>
      `;
    } else if (locationUrl) {
      deliveryQrHtml = `
        <div style="text-align: center; margin: 4px 0; font-size: ${fontSize - 2}px; word-break: break-all; color: #555;">📍 ${locationUrl}</div>
      `;
    }
  }

  // Split receipt so the delivery QR image appears right under the customer address
  let receiptHeaderContent = '';
  let receiptBodyContent = '';
  if (addressEndIndex > 0 && deliveryQrHtml) {
    receiptHeaderContent = receipt.slice(0, addressEndIndex).join("\n");
    receiptBodyContent = receipt.slice(addressEndIndex).join("\n");
  }
  const receiptContent = receipt.join("\n");

  const logoHtml = showLogo ? `<img src="${printerSettings.restaurant_logo_url || 'https://media.base44.com/images/public/69709def3c5445d198d66244/3bde95882_Screenshot2026-06-28at44148PM.png'}" style="width: 90mm; height: auto; display: block; margin: 0 auto 5px; filter: brightness(0);" />` : '';
  const orderNumberHtml = printerSettings.show_order_number ? `<div style="text-align: center;"><span style="font-weight: bold; font-size: ${fontSize + 10}px; padding: 10px 20px; border: 3px solid #000; display: inline-block;">Order #${order.id.slice(0, 8).toUpperCase()}</span></div>` : '';
  
  const orderTypeLabel = order.order_type === "dine_in" ? "Dine-In" : 
                        order.order_type === "delivery" ? `Delivery ${order.delivery_company_name || ''}` : "Takeaway";
  const orderTypeHtml = printerType === "cashier" ? `<div style="text-align: center; font-weight: bold; font-size: ${fontSize + 2}px; margin: 3px auto;">${orderTypeLabel}</div>` : '';
  
  if (printerType === "cashier") {
    totalsHtml = `
      <div style="font-family: 'Consolas', 'Monaco', 'Lucida Console', monospace; font-size: ${fontSize - 1}px; margin: 5px 0; line-height: 1.4;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>Subtotal:</span><span>${formatCurrency(order.subtotal)}</span>
        </div>
        ${printerSettings.show_service_breakdown ? `
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>Service:</span><span>${formatCurrency(order.service_charge || 0)}</span>
        </div>` : ''}
        ${printerSettings.show_tax_breakdown ? `
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>Tax:</span><span>${formatCurrency(order.tax || 0)}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${order.is_pro_delivery ? 'Delivery (Pro Free Delivery):' : 'Delivery Fee:'}</span><span>${formatCurrency(order.delivery_fee || 0)}</span>
        </div>
        ${(order.delivery_company_fee || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${order.delivery_company_name || 'Company'} Service Fee:</span><span>${formatCurrency(order.delivery_company_fee)}</span>
        </div>` : ''}
        ${order.order_type === 'delivery' && order.delivery_company_id && await hasDeliveryCompanyCommission(order) ? `
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>${order.delivery_company_name} Commission (${await getDeliveryCompanyPercentage(order)}):</span><span>${await getDeliveryCompanyCommission(order)}</span>
        </div>` : ''}
        ${(() => {
          // Compute total discount from totals — most reliable, works even if discount fields weren't saved
          const grossTotal = (order.subtotal || 0) + (order.tax || 0) + (order.service_charge || 0) + (order.delivery_fee || 0) + (order.delivery_company_fee || 0);
          const totalDiscount = Math.max(0, Math.round((grossTotal - (order.total || 0) - (order.cashback_used || 0)) * 100) / 100);
          
          let parts = [];
          if (order.discount_amount > 0) parts.push(`Manual${order.manual_discount_percent ? ` (${order.manual_discount_percent}%)` : ''}`);
          const label = parts.length > 0 ? `Discount (${parts.join(' + ')})` : 'Discount';
          return `<div style="display: flex; justify-content: space-between; font-weight: bold;"><span>${label}:</span><span>-${formatCurrency(totalDiscount)}</span></div>`;
        })()}
        ${order.cashback_used > 0 ? `
        <div style="display: flex; justify-content: space-between;">
          <span>Cashback Discount:</span><span>-${formatCurrency(order.cashback_used)}</span>
        </div>` : ''}
        ${(order.minimum_charge_adjustment || 0) > 0 ? `
        <div style="display: flex; justify-content: space-between; color: #b45309; font-weight: bold;">
          <span>Min Charge (${formatCurrency(order.minimum_charge_per_guest)} &times; ${order.minimum_charge_guests} guests):</span><span>${formatCurrency(order.minimum_charge_total)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #b45309; font-weight: bold;">
          <span>Min Charge Adjustment:</span><span>+${formatCurrency(order.minimum_charge_adjustment)}</span>
        </div>` : ''}
      </div>
      <div style="border-top: 2px solid #000; margin: 5px 0;"></div>
    `;
  }
  
  const totalHtml = printerType === "cashier" ? `
    <div style="text-align: center; font-weight: bold; font-size: ${fontSize + 8}px; margin: 10px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0;">
      TOTAL: ${formatCurrency(order.total)}
    </div>
  ` : '';
  
  let paymentAndFooterHtml = '';
  if (printerType === "cashier") {
    if (printerSettings.show_payment_method && order.payment_method) {
      const paymentLabel = order.payment_method === "visa_cash" ? `Visa (${formatCurrency(order.visa_amount || 0)}) + Cash (${formatCurrency(order.secondary_amount || 0)})` :
                          order.payment_method === "visa_instapay" ? `Visa (${formatCurrency(order.visa_amount || 0)}) + Instapay (${formatCurrency(order.secondary_amount || 0)})` :
                          order.payment_method === "cash" ? "Cash" :
                          order.payment_method === "visa" ? "Visa" :
                          order.payment_method === "card" ? "Card" : 
                          order.payment_method === "recharge_balance" ? "Recharge Wallet" : "Wallet";
      paymentAndFooterHtml += `<div style="font-family: '${fontName}', 'Consolas', 'Monaco', 'Lucida Console', monospace; font-size: ${fontSize - 1}px; margin: 5px 0; text-align: left;">Payment: ${paymentLabel}</div>`;
    }
    
    if (order.payment_method === "recharge_balance" && order.recharge_balance_before !== undefined && customer) {
      const totalRecharged = customer.total_recharged || 0;
      const consumedSoFar = totalRecharged - order.recharge_balance_after;
      
      paymentAndFooterHtml += `
        <div style="font-family: '${fontName}', 'Consolas', 'Monaco', 'Lucida Console', monospace; font-size: ${fontSize - 1}px; margin: 10px 0; border-top: 1px solid #000; padding-top: 5px;">
          <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span>Balance Before:</span><span style="font-weight: bold;">${formatCurrency(order.recharge_balance_before)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span>Amount Deducted:</span><span style="font-weight: bold; color: #d00;">-${formatCurrency(order.recharge_balance_deducted)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 2px 0;">
            <span>Balance After:</span><span style="font-weight: bold;">${formatCurrency(order.recharge_balance_after)}</span>
          </div>
        </div>
      `;
    }
  }
  
  let receiptFooterHtml = '';
  if (printerType === "cashier" && printerSettings.receipt_footer) {
    receiptFooterHtml = `<div style="font-family: '${fontName}', 'Consolas', 'Monaco', 'Lucida Console', monospace; font-size: ${fontSize - 1}px; margin: 10px 0 5px 0; text-align: center;">${printerSettings.receipt_footer}</div>`;
  }

  let genmoMarketingHtml = '';
  if (printerType === "cashier") {
    genmoMarketingHtml = `
      <div style="font-family: '${fontName}', 'Consolas', 'Monaco', 'Lucida Console', monospace; font-size: ${fontSize - 2}px; margin: 15px 0 10px 0; padding: 10px 0; border-top: 2px solid #000; text-align: center; line-height: 1.5;">
        <div style="font-weight: bold; font-size: ${fontSize}px; margin-bottom: 5px;">🎁 برنامج ${brandName()} GenMo</div>
        <div style="margin: 3px 0;">
          <div style="margin: 3px 0;"><b>💰 كاش باك على طلباتك</b></div>
          <div style="font-size: ${fontSize - 3}px; margin: 2px 0;">كل طلب تقدمه بتكسب نسبة كاش باك</div>
        </div>
        <div style="margin: 3px 0;">
          <div style="margin: 3px 0;"><b>👥 كاش باك من صحابك</b></div>
          <div style="font-size: ${fontSize - 3}px; margin: 2px 0;">كود الدعوة = أنت وصحابك تكسبوا</div>
        </div>
        <div style="margin: 3px 0;">
          <div style="margin: 3px 0;"><b>🌳 شبكة تكبر = أرباح أكتر</b></div>
          <div style="font-size: ${fontSize - 3}px; margin: 2px 0;">أصحاب أصحابك = دخل إضافي</div>
        </div>
      </div>
    `;
  }
  
  let footerContactHtml = '';
  if (printerType === "cashier") {
    const footerItems = [];
    if (printerSettings.show_address && printerSettings.restaurant_address) {
      footerItems.push(printerSettings.restaurant_address);
    }
    const phoneWhatsapp = [];
    if (printerSettings.show_phone && printerSettings.restaurant_phone) {
      phoneWhatsapp.push(`<b style="font-size: ${fontSize}px;">Tel: ${printerSettings.restaurant_phone}</b>`);
    }
    if (printerSettings.show_whatsapp && printerSettings.restaurant_whatsapp) {
      phoneWhatsapp.push(`<b style="font-size: ${fontSize}px;">WhatsApp: ${printerSettings.restaurant_whatsapp}</b>`);
    }
    if (phoneWhatsapp.length > 0) {
      footerItems.push(phoneWhatsapp.join(' | '));
    }
    const hotlineWebsite = [];
    if (printerSettings.show_hotline && printerSettings.restaurant_hotline) {
      hotlineWebsite.push(`Hotline: ${printerSettings.restaurant_hotline}`);
    }
    if (printerSettings.show_website && printerSettings.restaurant_website) {
      hotlineWebsite.push(printerSettings.restaurant_website);
    }
    if (hotlineWebsite.length > 0) {
      footerItems.push(hotlineWebsite.join(' | '));
    }
    const registrationTax = [];
    if (printerSettings.commercial_registration) {
      registrationTax.push(`<b>C.R: ${printerSettings.commercial_registration}</b>`);
    }
    if (printerSettings.tax_card) {
      registrationTax.push(`<b>Tax Card: ${printerSettings.tax_card}</b>`);
    }
    if (registrationTax.length > 0) {
      footerItems.push(registrationTax.join(' | '));
    }
    if (footerItems.length > 0) {
      footerContactHtml = `<div style="font-size: ${fontSize - 2}px; text-align: left; margin-top: 5px; line-height: 1.4;">${footerItems.join('<br>')}</div>`;
    }
  }

  return `
    <html>
      <head>
        <title>${printerSettings.name || printerType.toUpperCase()} Receipt</title>
        <meta name="printer" content="${printerSettings.name || ''}">
        <style>
          @page {
            size: ${receiptWidth}mm auto;
            margin: 0 !important;
            padding: 0 !important;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              margin: 0 !important;
              padding: 0 !important;
            }
            body {
              margin: 0 !important;
              padding: 1mm 2mm !important;
            }
          }
          body {
            font-family: '${fontName}', 'Consolas', 'Monaco', 'Lucida Console', monospace;
            font-size: ${fontSize}px;
            width: ${receiptWidth}mm;
            margin: -20mm auto 0 auto;
            padding: 2px;
            background: white;
          }
          pre {
            white-space: pre-wrap;
            margin: 0;
            line-height: 1.2;
            font-size: ${fontSize - 1}px;
          }
        </style>
      </head>
      <body>
        ${logoHtml}
        ${orderNumberHtml}
        ${orderTypeHtml}
        ${headerHtml}
        ${receiptHeaderContent ? `<pre>${receiptHeaderContent}</pre>${deliveryQrHtml}<pre>${receiptBodyContent}</pre>` : `<pre>${receiptContent}</pre>${deliveryQrHtml}`}
        ${totalsHtml}
         ${totalHtml}
         ${paymentAndFooterHtml}
         ${footerContactHtml}
         ${genmoMarketingHtml}
         ${receiptFooterHtml}
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
              setTimeout(() => {
                const iframe = window.frameElement;
                if (iframe && iframe.parentNode) {
                  iframe.parentNode.removeChild(iframe);
                }
              }, 500);
            }, 100);
          }
        </script>
      </body>
    </html>
  `;
}