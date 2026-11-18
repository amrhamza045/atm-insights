import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { movementRow, recordMovements } from '../_shared/inventoryMovements.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, 'butchery_edit');
    if (denied) return denied;

    const body = await req.json();
    const { date, inputs, outputs, labor_cost, notes, branch_id, branch_name } = body;
    if (!inputs || !inputs.length || !outputs || !outputs.length) {
      return Response.json({ error: 'Inputs and outputs are required' }, { status: 400 });
    }

    let inputTotalCost = 0;
    const inputSkus = [];
    const lotChain = new Set();

    for (const inp of inputs) {
      const rm = await base44.entities.ButcheryRawMaterial.get(inp.sku_id);
      if (!rm) return Response.json({ error: `Input SKU not found: ${inp.sku_id}` }, { status: 404 });
      if (rm.status === 'reworked' || (rm.quantity || 0) <= 0) return Response.json({ error: `SKU "${rm.sku_name}" is fully consumed and cannot be reworked again` }, { status: 400 });
      const consumeQty = Number(inp.quantity);
      if (consumeQty > (rm.quantity || 0)) return Response.json({ error: `Quantity exceeds available for "${rm.sku_name}"` }, { status: 400 });
      const consumedCost = (rm.unit_cost || 0) * consumeQty;
      inputTotalCost += consumedCost;
      inputSkus.push({ rm, consumeQty, consumedCost });
      if (rm.lot_number) lotChain.add(rm.lot_number);
      (rm.rework_parent_lot_chain || []).forEach(l => lotChain.add(l));
    }

    const totalOutputCost = inputTotalCost + (labor_cost || 0);
    const totalOutputWeight = outputs.reduce((s, o) => s + Number(o.quantity || 0), 0);
    const firstInput = inputSkus[0].rm;
    const outputSkuIds = [];
    const outputSkuNames = [];
    const outputQuantities = [];
    const movementRows = [];

    for (const out of outputs) {
      const qty = Number(out.quantity || 0);
      const share = totalOutputWeight > 0 ? qty / totalOutputWeight : 0;
      const allocatedCost = totalOutputCost * share;
      const unitCost = qty > 0 ? allocatedCost / qty : 0;
      const lotNumber = `RW-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const itemName = out.item_name || out.sku_name;
      const skuNumber = `SKU-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      const newRm = await base44.entities.ButcheryRawMaterial.create({
        sku_name: skuNumber, item_name: itemName, lot_number: lotNumber, source_type: 'rework', rework_event_id: '',
        slaughter_event_id: firstInput.slaughter_event_id || '', animal_id: firstInput.animal_id || '',
        animal_tag: firstInput.animal_tag || '', supplier_id: firstInput.supplier_id || '',
        supplier_name: firstInput.supplier_name || '', quantity: qty, unit: out.unit || firstInput.unit || 'kg',
        packaging_date: date, quality_grade: out.quality_grade || firstInput.quality_grade || 'ungraded',
        allocation_method: 'weight', allocated_cost: allocatedCost, unit_cost: unitCost,
        market_price_per_unit: out.market_price_per_unit || 0, status: 'in_stock',
        rework_parent_lot_chain: Array.from(lotChain), notes: notes || '',
      });

      // Push to inventory — merge into an existing item with the same name/branch, or create a new one
      const existing = await base44.entities.InventoryItem.filter({ name: itemName });
      const match = existing.find((i: any) => !branch_id || i.branch_id === branch_id);
      let invItem;
      if (match) {
        await base44.entities.InventoryItem.update(match.id, {
          quantity: (match.quantity || 0) + qty, cost_per_unit: unitCost,
          category_name: match.category_name || 'Butchery',
        });
        invItem = { ...match, cost_per_unit: unitCost };
        movementRows.push(movementRow(invItem, {
          key: `butchery_output:${newRm.id}`, direction: 'in', type: 'butchery_output', quantity: qty, unit: out.unit,
          before: match.quantity || 0, after: (match.quantity || 0) + qty, cost_impact: allocatedCost,
          source_entity: 'ButcheryRawMaterial', source_id: newRm.id, source_label: `Butchery rework · ${date || ''}`.trim(), actor_email: user.email,
        }));
      } else {
        invItem = await base44.entities.InventoryItem.create({
          name: itemName, branch_id: branch_id || null, branch_name: branch_name || null,
          quantity: qty, unit: out.unit || 'kg',
          purchase_unit: 'weight', purchase_unit_label: out.unit || 'kg',
          selling_unit: 'weight', selling_unit_label: out.unit || 'kg',
          cost_per_unit: unitCost, category_name: 'Butchery',
        });
        movementRows.push(movementRow(invItem, {
          key: `butchery_output:${newRm.id}`, direction: 'in', type: 'butchery_output', quantity: qty, unit: out.unit,
          before: 0, after: qty, cost_impact: allocatedCost,
          source_entity: 'ButcheryRawMaterial', source_id: newRm.id, source_label: `Butchery rework · ${date || ''}`.trim(), actor_email: user.email,
        }));
      }
      await base44.entities.ButcheryRawMaterial.update(newRm.id, { inventory_item_id: invItem.id });

      outputSkuIds.push(newRm.id);
      outputSkuNames.push(itemName);
      outputQuantities.push(qty);
    }

    // Mark input SKUs as reworked / reduce quantity
    for (const { rm, consumeQty } of inputSkus) {
      const newQty = Math.max(0, (rm.quantity || 0) - consumeQty);
      const fullyConsumed = newQty <= 0;
      await base44.entities.ButcheryRawMaterial.update(rm.id, {
        quantity: newQty, status: fullyConsumed ? 'reworked' : rm.status,
      });
      if (rm.inventory_item_id) {
        // Deduct consumed qty (inventory item may be shared by multiple lots)
        const inv = await base44.entities.InventoryItem.get(rm.inventory_item_id).catch(() => null);
        if (inv) {
          const after = Math.max(0, (inv.quantity || 0) - consumeQty);
          await base44.entities.InventoryItem.update(inv.id, { quantity: after });
          movementRows.push(movementRow(inv, {
            key: `butchery_input:${rm.id}:${date || ''}:${consumeQty}:${Date.now()}`, direction: 'out', type: 'butchery_input', quantity: consumeQty,
            before: inv.quantity || 0, after, source_entity: 'ButcheryRawMaterial', source_id: rm.id,
            source_label: `Butchery rework · ${rm.sku_name || ''}`.trim(), actor_email: user.email,
          }));
        }
      }
    }

    await recordMovements(base44.asServiceRole.entities, movementRows);

    const reworkEvent = await base44.entities.ReworkEvent.create({
      date, input_sku_ids: inputs.map(i => i.sku_id), input_sku_names: inputSkus.map(s => s.rm.sku_name),
      input_quantities: inputSkus.map(s => s.consumeQty), input_total_cost: inputTotalCost,
      output_sku_ids: outputSkuIds, output_sku_names: outputSkuNames, output_quantities: outputQuantities,
      labor_cost: labor_cost || 0, total_output_cost: totalOutputCost, lot_chain: Array.from(lotChain), notes: notes || '',
    });

    for (const oid of outputSkuIds) {
      await base44.entities.ButcheryRawMaterial.update(oid, { rework_event_id: reworkEvent.id });
    }

    await base44.entities.AuditLog.create({
      admin_id: user.id, admin_email: user.email, action_type: 'create',
      entity_type: 'ReworkEvent', entity_id: reworkEvent.id,
      entity_name: `Rework: ${outputSkuNames.join(', ')}`,
      action_description: `Reworked ${inputSkus.length} input SKU(s) into ${outputSkuIds.length} output SKU(s). Input cost: ${inputTotalCost.toFixed(2)}, Labor: ${(labor_cost || 0).toFixed(2)}, Total: ${totalOutputCost.toFixed(2)}`,
      changes: { input_cost: inputTotalCost, labor: labor_cost, total: totalOutputCost },
      status: 'success',
    });

    return Response.json({
      success: true, rework_event_id: reworkEvent.id, output_sku_ids: outputSkuIds,
      total_output_cost: totalOutputCost, input_total_cost: inputTotalCost,
    });
  } catch (error) {
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
