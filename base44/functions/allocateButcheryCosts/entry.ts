import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, 'butchery_edit');
    if (denied) return denied;

    const body = await req.json();
    const { slaughter_event_id, tolerance_percent } = body;
    if (!slaughter_event_id) return Response.json({ error: 'slaughter_event_id is required' }, { status: 400 });

    const event = await base44.entities.SlaughterEvent.get(slaughter_event_id);
    if (!event) return Response.json({ error: 'Slaughter event not found' }, { status: 404 });

    const animal = await base44.entities.Animal.get(event.animal_id);
    if (!animal) return Response.json({ error: 'Animal not found' }, { status: 404 });

    // --- Step 1: Pro-rate batch shared cost by carcass weight ---
    let processingCostShare = 0;
    let allocMethod = 'weight';
    if (event.processing_batch_id) {
      const batch = await base44.entities.ProcessingBatch.get(event.processing_batch_id);
      if (batch) {
        const totalShared = (batch.labor_cost || 0) + (batch.overhead_cost || 0) + (batch.disposal_cost || 0);
        if (batch.cost_allocation_method) allocMethod = batch.cost_allocation_method;
        const batchEvents = await base44.entities.SlaughterEvent.filter({ processing_batch_id: batch.id });
        // Weight base = all non-fully-condemned animals in the batch
        const eligible = batchEvents.filter(e => e.condemnation_type !== 'full');
        const weightBase = eligible.reduce((s, e) => s + (e.cold_carcass_weight || e.hot_carcass_weight || 0), 0);
        const myWeight = event.condemnation_type === 'full' ? 0 : (event.cold_carcass_weight || event.hot_carcass_weight || 0);
        processingCostShare = weightBase > 0 ? totalShared * (myWeight / weightBase) : 0;
      }
    }

    const purchaseCost = animal.purchase_cost || 0;
    const disposalCost = event.disposal_cost || 0;
    const totalCost = purchaseCost + processingCostShare + disposalCost;

    // --- Fetch cuts and by-products ---
    const cuts = await base44.entities.PrimalCut.filter({ slaughter_event_id });
    const byproducts = await base44.entities.WasteByProduct.filter({ slaughter_event_id });
    const validCuts = cuts.filter(c => !c.is_condemned);

    // --- Step 2: By-product recovery value with fallback priority ---
    const globalDefault = 0; // fallback when no historical by-product sale data exists
    let totalRecovery = 0;
    const recoveryBreakdown = [];

    for (const bp of byproducts) {
      if (bp.type !== 'by_product') continue;
      let value = bp.recovery_value || 0;
      let source = bp.recovery_value_source || 'manual';
      let estimated = bp.is_estimated || false;

      if (value <= 0) {
        // Fallback: historical sale prices for same by-product category
        const catRecords = await base44.entities.WasteByProduct.filter({ category: bp.category, type: 'by_product' });
        const rmIds = [...new Set(catRecords.filter(r => r.raw_material_id).map(r => r.raw_material_id))];
        const unitPrices = [];
        for (const rid of rmIds) {
          const rm = await base44.entities.ButcheryRawMaterial.get(rid);
          if (rm && rm.status === 'sold' && rm.sale_price > 0 && rm.sale_quantity > 0) {
            unitPrices.push(rm.sale_price / rm.sale_quantity);
          }
        }
        if (unitPrices.length >= 3) {
          const last3 = unitPrices.slice(-3);
          value = (last3.reduce((s, p) => s + p, 0) / last3.length) * (bp.weight || 0);
          source = 'rolling_avg';
        } else if (unitPrices.length > 0) {
          value = unitPrices[unitPrices.length - 1] * (bp.weight || 0);
          source = 'last_market';
        } else {
          value = globalDefault * (bp.weight || 0);
          source = 'global_default';
          estimated = true;
        }
        await base44.entities.WasteByProduct.update(bp.id, {
          recovery_value: value, recovery_value_source: source, is_estimated: estimated,
        });
      }
      totalRecovery += value;
      recoveryBreakdown.push({ id: bp.id, name: bp.name, value, source, estimated });
    }

    const netCostToAllocate = totalCost - totalRecovery;

    // --- Step 3: Allocate net cost across primal cuts ---
    const totalEdibleWeight = validCuts.reduce((s, c) => s + (c.weight || 0), 0);
    const totalValue = validCuts.reduce((s, c) => s + ((c.weight || 0) * (c.market_price_per_unit || 0)), 0);

    for (const cut of validCuts) {
      let allocated = 0;
      if (allocMethod === 'value' && totalValue > 0) {
        allocated = netCostToAllocate * (((cut.weight || 0) * (cut.market_price_per_unit || 0)) / totalValue);
      } else if (totalEdibleWeight > 0) {
        allocated = netCostToAllocate * ((cut.weight || 0) / totalEdibleWeight);
      }
      const yieldPct = event.cold_carcass_weight ? ((cut.weight / event.cold_carcass_weight) * 100) : 0;
      await base44.entities.PrimalCut.update(cut.id, {
        allocated_cost: allocated, allocation_method: allocMethod, yield_percentage: yieldPct,
      });
      // Update linked raw materials + inventory unit cost
      const rms = await base44.entities.ButcheryRawMaterial.filter({ primal_cut_id: cut.id, source_type: 'primal_cut' });
      for (const rm of rms) {
        const unitCost = (rm.quantity || 0) > 0 ? allocated / rm.quantity : 0;
        await base44.entities.ButcheryRawMaterial.update(rm.id, {
          allocated_cost: allocated, unit_cost: unitCost, allocation_method: allocMethod,
        });
        if (rm.inventory_item_id) {
          await base44.entities.InventoryItem.update(rm.inventory_item_id, { cost_per_unit: unitCost });
        }
      }
    }

    // Condemned cuts: zero cost
    for (const cut of cuts.filter(c => c.is_condemned)) {
      await base44.entities.PrimalCut.update(cut.id, { allocated_cost: 0 });
    }

    // By-product raw materials get their recovery value as allocated cost
    for (const bp of byproducts) {
      if (bp.type !== 'by_product' || !bp.raw_material_id) continue;
      const rm = await base44.entities.ButcheryRawMaterial.get(bp.raw_material_id);
      if (rm) {
        const unitCost = (rm.quantity || 0) > 0 ? (bp.recovery_value || 0) / rm.quantity : 0;
        await base44.entities.ButcheryRawMaterial.update(bp.raw_material_id, {
          allocated_cost: bp.recovery_value || 0, unit_cost: unitCost,
        });
        if (rm.inventory_item_id) {
          await base44.entities.InventoryItem.update(rm.inventory_item_id, { cost_per_unit: unitCost });
        }
      }
    }

    // --- Weight reconciliation ---
    const tolerance = tolerance_percent != null ? Number(tolerance_percent) : 3;
    const carcassWt = event.cold_carcass_weight || event.hot_carcass_weight || 0;
    const cutsWeight = cuts.reduce((s, c) => s + (c.weight || 0), 0);
    const byproductWeight = byproducts.reduce((s, b) => s + (b.weight || 0), 0);
    const variance = carcassWt > 0 ? Math.abs(cutsWeight + byproductWeight - carcassWt) / carcassWt * 100 : 0;
    let reconStatus = 'pending';
    if (carcassWt > 0 && (cutsWeight > 0 || byproductWeight > 0)) {
      reconStatus = variance > tolerance ? 'warning' : 'complete';
    }

    const liveWt = animal.live_weight || 0;
    const dressingPct = liveWt > 0 ? (carcassWt / liveWt) * 100 : 0;

    const updated = await base44.entities.SlaughterEvent.update(slaughter_event_id, {
      processing_cost_share: processingCostShare,
      total_cost: totalCost,
      net_cost_to_allocate: netCostToAllocate,
      dressing_percentage: dressingPct,
      reconciliation_status: reconStatus,
      cost_allocated: true,
    });

    await base44.entities.AuditLog.create({
      admin_id: user.id, admin_email: user.email, action_type: 'update',
      entity_type: 'SlaughterEvent', entity_id: slaughter_event_id,
      entity_name: event.animal_tag || 'Slaughter Event',
      action_description: `Allocated costs for ${event.animal_tag}. Total: ${totalCost.toFixed(2)}, Net: ${netCostToAllocate.toFixed(2)}, Method: ${allocMethod}, Recovery: ${totalRecovery.toFixed(2)}`,
      changes: { total_cost: totalCost, net_cost: netCostToAllocate, method: allocMethod, recovery: totalRecovery, variance },
      status: 'success',
    });

    return Response.json({
      success: true, total_cost: totalCost, net_cost_to_allocate: netCostToAllocate,
      processing_cost_share: processingCostShare, total_recovery: totalRecovery,
      recovery_breakdown: recoveryBreakdown, allocation_method: allocMethod,
      reconciliation_status: reconStatus, variance_percent: variance, event: updated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});