import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { sendReport } from '../_shared/reportRecipients.js';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { getCompanyOffset, formatInOffset } from '../_shared/companyTimezone.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, 'inventory_view');
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const branchId = body.branch_id || null;
    const startDate = body.start_date || null;
    const endDate = body.end_date || null;
    // Recipients come only from Settings → Report Recipients; no address is read from the request.
    const sendEmail = body.send_email === true;


    // --- 1. Fetch inventory items ---
    const inventoryItems = await base44.asServiceRole.entities.InventoryItem.list('-created_date', 500);
    const filteredItems = inventoryItems.filter(it => !branchId || it.branch_id === branchId);

    // --- 2. Fetch delivered purchase orders → sum received_selling_qty per inventory item ---
    const purchaseOrders = await base44.asServiceRole.entities.PurchaseOrder.list('-created_date', 500);
    const deliveredPOs = purchaseOrders.filter(po => {
      if (po.status !== 'delivered') return false;
      if (branchId && po.branch_id !== branchId) return false;
      if (startDate) {
        const d = new Date(po.order_date || po.created_date).getTime();
        if (d < new Date(startDate).getTime()) return false;
      }
      if (endDate) {
        const d = new Date(po.order_date || po.created_date).getTime();
        if (d > new Date(endDate).getTime()) return false;
      }
      return true;
    });

    const purchasedByItemId = {};
    for (const po of deliveredPOs) {
      for (const item of (po.items || [])) {
        if (item.approval_status === 'rejected') continue;
        const iid = item.inventory_item_id;
        if (!iid) continue;
        purchasedByItemId[iid] = (purchasedByItemId[iid] || 0) + (item.received_selling_qty || 0);
      }
    }

    // --- 3. Fetch menu items → build recipe map (menu_item_id → [{inventory_item_id, quantity_needed}]) ---
    const menuItems = await base44.asServiceRole.entities.MenuItem.list('-created_date', 500);
    const recipeMap = {};
    for (const mi of menuItems) {
      const ingredients = [];
      if (Array.isArray(mi.recipe)) {
        for (const ing of mi.recipe) {
          if (ing.inventory_item_id && ing.quantity_needed) {
            ingredients.push({ inventory_item_id: ing.inventory_item_id, quantity_needed: ing.quantity_needed });
          }
        }
      }
      // size_recipes: keys are size names, values are arrays of ingredients
      if (mi.size_recipes && typeof mi.size_recipes === 'object') {
        for (const [sizeName, ings] of Object.entries(mi.size_recipes)) {
          if (Array.isArray(ings)) {
            for (const ing of ings) {
              if (ing.inventory_item_id && ing.quantity_needed) {
                ingredients.push({ inventory_item_id: ing.inventory_item_id, quantity_needed: ing.quantity_needed });
              }
            }
          }
        }
      }
      if (ingredients.length > 0) {
        recipeMap[mi.id] = ingredients;
      }
    }

    // --- 4. Fetch orders → compute consumption per inventory item ---
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    const relevantOrders = orders.filter(o => {
      if (!['paid', 'completed', 'preparing', 'ready'].includes(o.status)) return false;
      if (o.status === 'cancelled') return false;
      if (branchId && o.branch_id !== branchId) return false;
      if (startDate) {
        const d = new Date(o.created_date).getTime();
        if (d < new Date(startDate).getTime()) return false;
      }
      if (endDate) {
        const d = new Date(o.created_date).getTime();
        if (d > new Date(endDate).getTime()) return false;
      }
      return true;
    });

    const consumedByItemId = {};
    for (const order of relevantOrders) {
      for (const oi of (order.items || [])) {
        const recipe = recipeMap[oi.menu_item_id];
        if (!recipe) continue;
        const qty = oi.quantity || 0;
        for (const ing of recipe) {
          consumedByItemId[ing.inventory_item_id] = (consumedByItemId[ing.inventory_item_id] || 0) + (qty * ing.quantity_needed);
        }
      }
    }

    // --- 5. Build compliance rows ---
    const rows = filteredItems.map(it => {
      const purchased = purchasedByItemId[it.id] || 0;
      const consumed = consumedByItemId[it.id] || 0;
      const currentStock = it.quantity || 0;
      const expectedStock = purchased - consumed;
      const discrepancy = currentStock - expectedStock;
      const discrepancyPct = expectedStock !== 0 ? (discrepancy / Math.abs(expectedStock)) * 100 : (discrepancy !== 0 ? 100 : 0);

      let status = 'compliant';
      if (Math.abs(discrepancyPct) > 20) status = 'critical';
      else if (Math.abs(discrepancyPct) > 5) status = 'warning';

      return {
        inventory_item_id: it.id,
        name: it.name,
        category_name: it.category_name || '',
        branch_name: it.branch_name || 'All Branches',
        purchase_unit: it.purchase_unit,
        purchase_unit_label: it.purchase_unit_label || it.unit || '',
        selling_unit: it.selling_unit,
        selling_unit_label: it.selling_unit_label || it.unit || '',
        total_purchased: purchased,
        total_consumed: consumed,
        current_stock: currentStock,
        expected_stock: expectedStock,
        discrepancy: discrepancy,
        discrepancy_pct: discrepancyPct,
        status: status,
        is_weight: it.purchase_unit === 'weight' || it.selling_unit === 'weight'
      };
    });

    // Sort: weight items first, then by discrepancy magnitude descending
    rows.sort((a, b) => {
      if (a.is_weight !== b.is_weight) return a.is_weight ? -1 : 1;
      return Math.abs(b.discrepancy) - Math.abs(a.discrepancy);
    });

    const summary = {
      total_items: rows.length,
      weight_items: rows.filter(r => r.is_weight).length,
      compliant: rows.filter(r => r.status === 'compliant').length,
      warning: rows.filter(r => r.status === 'warning').length,
      critical: rows.filter(r => r.status === 'critical').length,
      total_purchased_value: rows.reduce((s, r) => s + r.total_purchased, 0),
      total_consumed_value: rows.reduce((s, r) => s + r.total_consumed, 0),
      total_discrepancy: rows.reduce((s, r) => s + Math.abs(r.discrepancy), 0)
    };

    // --- 6. Email report if requested ---
    if (sendEmail) {
      const fmtNum = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const fmtPct = (n) => `${n > 0 ? '+' : ''}${Number(n || 0).toFixed(1)}%`;

      const tableRows = rows.map(r => `
        <tr style="${r.status === 'critical' ? 'background:#fef2f2;' : r.status === 'warning' ? 'background:#fffbeb;' : ''}">
          <td style="padding:8px;border:1px solid #e5e7eb;">${r.is_weight ? '⚖️' : '📦'} ${r.name}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${r.category_name || '-'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmtNum(r.total_purchased)} ${r.selling_unit_label}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmtNum(r.total_consumed)} ${r.selling_unit_label}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${fmtNum(r.expected_stock)} ${r.selling_unit_label}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">${fmtNum(r.current_stock)} ${r.selling_unit_label}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${r.discrepancy < 0 ? '#dc2626' : '#16a34a'};">${r.discrepancy < 0 ? '' : '+'}${fmtNum(r.discrepancy)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;color:${r.status === 'critical' ? '#dc2626' : r.status === 'warning' ? '#d97706' : '#16a34a'};font-weight:bold;">${fmtPct(r.discrepancy_pct)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;color:${r.status === 'critical' ? '#dc2626' : r.status === 'warning' ? '#d97706' : '#16a34a'};">${r.status.toUpperCase()}</td>
        </tr>
      `).join('');

      const dateRangeLabel = startDate || endDate
        ? `${startDate || 'Start'} → ${endDate || 'Now'}`
        : 'All Time';

      const htmlBody = `
        <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
          <h1 style="color:#1e293b;border-bottom:3px solid #f59e0b;padding-bottom:10px;">⚖️ Inventory Weight Compliance Report</h1>
          <p style="color:#64748b;">Comparing Purchase Orders (IN) vs POS Consumption (OUT) vs Current Inventory Balance</p>

          <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Branch:</strong> ${branchId ? rows[0]?.branch_name || 'Selected' : 'All Branches'}</p>
            <p style="margin:4px 0;"><strong>Date Range:</strong> ${dateRangeLabel}</p>
            <p style="margin:4px 0;"><strong>Generated:</strong> ${formatInOffset(new Date(), await getCompanyOffset(base44.asServiceRole.entities))}</p>
          </div>

          <div style="background:${summary.critical > 0 ? '#fef2f2' : '#f0fdf4'};padding:16px;border-radius:8px;margin:16px 0;border:1px solid ${summary.critical > 0 ? '#fecaca' : '#bbf7d0'};">
            <h2 style="color:${summary.critical > 0 ? '#dc2626' : '#166534'};margin:0 0 12px;">📊 Compliance Summary</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">Total Items Checked</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;">${summary.total_items}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">⚖️ Weight-based Items</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;">${summary.weight_items}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">✅ Compliant (within 5%)</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;color:#16a34a;">${summary.compliant}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">⚠️ Warning (5-20%)</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;color:#d97706;">${summary.warning}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb;">❌ Critical (>20%)</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;color:#dc2626;">${summary.critical}</td></tr>
            </table>
          </div>

          <h2 style="color:#334155;">📋 Item-by-Item Breakdown</h2>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Item</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Category</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Purchased (IN)</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Consumed (OUT)</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Expected Stock</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Actual Stock</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Discrepancy</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:center;">Var %</th>
                <th style="padding:8px;border:1px solid #e5e7eb;text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>

          <div style="margin-top:16px;padding:12px;background:#fef3c7;border-radius:8px;">
            <p style="color:#92400e;font-size:12px;margin:0;">
              <strong>How this is calculated:</strong><br/>
              • <strong>Purchased (IN):</strong> Sum of received quantities from delivered Purchase Orders.<br/>
              • <strong>Consumed (OUT):</strong> Sum of (order item quantity × recipe quantity_needed) across all POS orders.<br/>
              • <strong>Expected Stock:</strong> Purchased − Consumed.<br/>
              • <strong>Discrepancy:</strong> Actual Inventory − Expected Stock. Negative = missing stock (possible theft/waste). Positive = extra (unrecorded additions).
            </p>
          </div>
        </div>
      `;

      await sendReport(base44.asServiceRole, 'inventory_weight_compliance',
        `⚖️ Inventory Weight Compliance Report - ${branchId ? rows[0]?.branch_name || 'Branch' : 'All Branches'} - ${new Date().toLocaleDateString('en-US')}`, htmlBody);
    }

    return Response.json({ success: true, summary, rows });
  } catch (error) {
    console.error('Inventory weight compliance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
