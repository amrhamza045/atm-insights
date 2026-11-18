import { createClientFromRequest } from 'npm:@base44/sdk@0.8.59';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { audit } from '../../shared/auditLog.js';
import { validatePurchaseSupplier } from '../../shared/purchaseSingleSupplier.js';
import { postInvoiceWithSupplierAccount } from '../../shared/supplierInvoicePosting.js';
import { loadConversionRules, toStockQuantity, resolveConversionFactor, getItemCostUnit, getItemStockUnit } from '../../shared/unitConversion.js';
import { averagePurchaseCost, costOrEntered } from '../../shared/inventoryAverageCost.js';
import { movementRow, recordMovements } from '../../shared/inventoryMovements.js';

// Two actions:
//  { invoice }          → saves the invoice as a DRAFT. No stock moves.
//  { post_invoice_id }  → a manager posts a draft: stock, cost and expiry tracking are applied.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    if (body?.post_invoice_id) {
      const denied = await denyUnlessPermitted(base44, user, ['purchase_approve']);
      if (denied) return denied;
      return await postInvoiceWithSupplierAccount(base44, user, body, () => postInvoice(base44, user, body.post_invoice_id));
    }

    const denied = await denyUnlessPermitted(base44, user, ['purchase_approve', 'purchase_edit']);
    if (denied) return denied;

    const invoiceData = body?.invoice;
    if (!invoiceData || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      return Response.json({ error: 'Invoice with at least one item is required' }, { status: 400 });
    }
    const branchId = typeof invoiceData.branch_id === 'string' ? invoiceData.branch_id.trim() : '';
    if (!branchId) {
      return Response.json({ error: 'A valid branch is required for every purchase invoice' }, { status: 400 });
    }
    const branch = await base44.entities.Branch.get(branchId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!branch) {
      return Response.json({ error: 'Selected branch not found' }, { status: 400 });
    }

    const supplier = await validatePurchaseSupplier(base44.entities, invoiceData);
    const invoice = await base44.entities.PurchaseInvoice.create({
      ...invoiceData,
      branch_id: branch.id,
      branch_name: invoiceData.branch_name || branch.name || '',
      supplier_name: supplier.name,
      status: 'draft'
    });
    await audit(base44, user, 'create', 'PurchaseInvoice', `Created draft purchase invoice ${invoice.invoice_number}`, { entityId: invoice.id, entityName: invoice.invoice_number });

    return Response.json({ success: true, invoice_id: invoice.id, status: 'draft' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: [400, 401, 403, 404, 409].includes(error.status) ? error.status : 500 });
  }
}

async function postInvoice(base44, user, invoiceId) {
  const invoiceData = await base44.entities.PurchaseInvoice.get(invoiceId);
  if (!invoiceData) return Response.json({ error: 'Invoice not found' }, { status: 404 });
  const branchId = typeof invoiceData.branch_id === 'string' ? invoiceData.branch_id.trim() : '';
  if (!branchId) {
    return Response.json({ error: 'Cannot post an invoice without a valid branch' }, { status: 400 });
  }
  if (invoiceData.status !== 'draft') {
    return Response.json({ error: 'This invoice is already posted' }, { status: 409 });
  }

  await validatePurchaseSupplier(base44.entities, invoiceData);

  // Lock first so a double click can't apply stock twice.
  await base44.entities.PurchaseInvoice.update(invoiceId, {
    status: 'posted',
    posted_by: user.email,
    posted_at: new Date().toISOString()
  });

  const unitRules = await loadConversionRules(base44.asServiceRole);
  // Every non-draft invoice of the branch (this one is now posted) feeds the average, as on Purchases › Average Prices.
  const branchInvoices = await base44.entities.PurchaseInvoice.filter({ branch_id: branchId, status: { $ne: 'draft' } }, '-created_date', 1000);
  const stockUpdates = [];
  for (const [lineIndex, line] of (invoiceData.items || []).entries()) {
    if (!line.inventory_item_id) continue;
    const item = await base44.entities.InventoryItem.get(line.inventory_item_id);
    if (!item) continue;

    const itemStockUnit = getItemStockUnit(item);
    const itemCostUnit = getItemCostUnit(item);
    const isWeightStock = (item.selling_unit || 'pcs') === 'weight';

    // Convert received quantity into the item's stock unit when a conversion rule applies
    let received;
    if (!isWeightStock && line.pieces_count != null && Number(line.pieces_count) > 0) {
      received = Number(line.pieces_count);
    } else if (line.unit && itemStockUnit) {
      const conv = toStockQuantity(Number(line.quantity || 0), line.unit, item, unitRules);
      received = conv.ok ? conv.quantity : Number(line.quantity || 0);
    } else {
      received = Number(line.quantity || 0);
    }
    if (!received) continue;

    // Each line's price normalized into the item's cost unit when the line used a different unit
    const priceInCostUnit = (l) => {
      const price = Number(l.purchase_price) || 0;
      if (!l.unit || !itemCostUnit || price <= 0) return price;
      const costConv = resolveConversionFactor(itemCostUnit, l.unit, { item, itemId: item.id, rules: unitRules });
      return costConv.ok ? Math.round(price * costConv.factor * 10000) / 10000 : price;
    };
    const updatedCostPerUnit = costOrEntered(averagePurchaseCost(item, branchInvoices, priceInCostUnit), item);

    stockUpdates.push({
      item,
      line_index: lineIndex,
      before: Number(item.quantity || 0),
      line_cost: Number(line.total_cost) || Math.round(Number(line.quantity || 0) * Number(line.purchase_price || 0) * 10000) / 10000,
      id: item.id,
      name: item.name,
      category_id: item.category_id || '',
      category_name: item.category_name || '',
      new_quantity: Math.round((Number(item.quantity || 0) + received) * 10000) / 10000,
      added: received,
      unit: itemStockUnit || line.unit || '',
      cost_per_unit: updatedCostPerUnit,
      expiry_date: line.expiry_date || ''
    });
  }

  for (const upd of stockUpdates) {
    await base44.entities.InventoryItem.update(upd.id, {
      quantity: upd.new_quantity,
      cost_per_unit: upd.cost_per_unit,
      ...(upd.expiry_date ? { expiry_date: upd.expiry_date } : {})
    });
    if (upd.expiry_date) {
      await base44.entities.ExpiryReport.create({
        branch_id: invoiceData.branch_id || '',
        branch_name: invoiceData.branch_name || '',
        inventory_item_id: upd.id,
        inventory_item_name: upd.name,
        category_id: upd.category_id,
        category_name: upd.category_name,
        batch_ref: invoiceData.invoice_number,
        expiry_date: upd.expiry_date,
        quantity_at_risk: upd.added,
        unit: upd.unit,
        estimated_value: upd.added * upd.cost_per_unit,
        status: 'open',
        notes: `Received on purchase invoice ${invoiceData.invoice_number}.`
      });
    }
  }

  await recordMovements(base44.asServiceRole.entities, stockUpdates.map((u) => movementRow({ ...u.item, cost_per_unit: u.cost_per_unit }, {
    key: `purchase:${invoiceId}:${u.line_index}`, direction: 'in', type: 'purchase', quantity: u.added, unit: u.unit,
    before: u.before, after: u.new_quantity, cost_impact: u.line_cost,
    source_entity: 'PurchaseInvoice', source_id: invoiceId,
    source_label: `Invoice ${invoiceData.invoice_number}${invoiceData.supplier_name ? ` · ${invoiceData.supplier_name}` : ''}`,
    actor_email: user.email,
  }, unitRules)));

  await audit(base44, user, 'approve', 'PurchaseInvoice', `Posted purchase invoice ${invoiceData.invoice_number} — stock updated for ${stockUpdates.length} item(s)`, { entityId: invoiceId, entityName: invoiceData.invoice_number });

  return Response.json({
    success: true,
    invoice_id: invoiceId,
    status: 'posted',
    updated_items: stockUpdates.map(u => ({ name: u.name, added: u.added, new_quantity: u.new_quantity }))
  });
}