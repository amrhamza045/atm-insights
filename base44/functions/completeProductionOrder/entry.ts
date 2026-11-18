import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import {
  freeStock,
  eventCustodyStock,
  recipesByOutput,
  resolveOrderRecipeStrict,
} from '../../shared/recipeNesting.js';
import {
  buildBatchReconciliationPreview,
  applyBatchReconciliation,
} from '../../shared/productionBatchReconciliation.js';
import {
  loadConversionRules,
  toStockQuantity,
  computeIngredientCost,
  getItemStockUnit,
  convertQuantity,
} from '../../shared/unitConversion.js';
import { eventItemLocalizer } from '../../shared/branchStock.js';
import { prepareProductionInventory } from '../../shared/inventoryProductionCapture.js';
import { movementRow, recordMovements } from '../../shared/inventoryMovements.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      action = 'complete',
      production_order_id,
      actual_output_quantity,
      waste_note,
      expiry_date,
      expected_fingerprint,
    } = body;

    if (!production_order_id) {
      return Response.json({ error: 'production_order_id is required' }, { status: 400 });
    }

    const requiredPerms =
      action === 'reconcile_apply'
        ? ['manufacturing_edit', 'catering_edit']
        : ['manufacturing_view', 'manufacturing_edit'];
    const denied = await denyUnlessPermitted(base44, user, requiredPerms);
    if (denied) return denied;

    const db = base44.asServiceRole.entities;
    const order = await db.ProductionOrder.get(production_order_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!order) return Response.json({ error: 'Production order not found' }, { status: 404 });

    // One-time reconciliation preview & apply for an already-completed catering batch
    if (action === 'reconcile_preview') {
      const preview = await buildBatchReconciliationPreview(db, order);
      return Response.json({ preview });
    }
    if (action === 'reconcile_apply') {
      const result = await applyBatchReconciliation(db, order, user, expected_fingerprint);
      if (!result.ok) {
        return Response.json({ error: result.error, preview: result.preview }, { status: result.status || 400 });
      }
      return Response.json(result);
    }

    if (order.status === 'completed') return Response.json({ error: 'Order already completed' }, { status: 400 });
    if (order.status === 'cancelled') return Response.json({ error: 'Order is cancelled' }, { status: 400 });

    // Strictly resolve recipe by saved recipe_id or unambiguous active recipe for output_item_id.
    // Never fall back to an empty recipe or infer by name.
    const resolution = await resolveOrderRecipeStrict(db, order);
    if (!resolution.recipe) {
      return Response.json(
        {
          error: resolution.error,
          code: resolution.source,
        },
        { status: 400 }
      );
    }
    const recipe = resolution.recipe;

    const batches = order.target_quantity || 1;
    const actualOutput = actual_output_quantity != null
      ? Number(actual_output_quantity)
      : (recipe.output_quantity || 1) * batches;

    // Pre-check: for catering orders linked to an event, verify ALL ingredients are available
    // in that event's kitchen custody (released via requisition batch); for regular orders,
    // verify free (non-reserved) stock. Quantities are converted to each item's stock unit.
    const isCateringCustody = order.order_source === 'catering' && !!order.catering_event_id;
    const [byOutput, rules] = await Promise.all([
      recipesByOutput(db),
      loadConversionRules(db),
    ]);
    const shortages = [];
    const invItems = {};
    const custodyPools = {};
    const resolvedNeeds = {};
    // Each branch cooks from its own stock: a catering batch uses the event branch's own items.
    const localize = isCateringCustody ? await eventItemLocalizer(db, order.catering_event_id, order.branch_id) : null;
    const itemIdOf = {};
    for (const ing of (recipe.ingredients || [])) {
      itemIdOf[ing.inventory_item_id] = localize ? await localize(ing.inventory_item_id) : ing.inventory_item_id;
    }

    for (const ingredient of (recipe.ingredients || [])) {
      const qtyNeededRaw = (Number(ingredient.quantity_needed) || 0) * batches;
      if (qtyNeededRaw <= 0) continue;
      const itemId = itemIdOf[ingredient.inventory_item_id];

      if (isCateringCustody) {
        const pool = await eventCustodyStock(db, itemId, order.catering_event_id, order.id, rules);
        invItems[itemId] = pool.inv;
        custodyPools[itemId] = pool;
        if (!pool.inv) {
          shortages.push(`${ingredient.inventory_item_name || 'Unknown ingredient'}: item not found in inventory`);
          continue;
        }
        const stockUnit = getItemStockUnit(pool.inv);
        const conv = toStockQuantity(qtyNeededRaw, ingredient.unit || stockUnit, pool.inv, rules);
        if (!conv.ok) {
          shortages.push(`${ingredient.inventory_item_name || pool.inv.name}: ${conv.message}`);
          continue;
        }
        const qtyInStockUnit = conv.quantity;
        resolvedNeeds[itemId] = { qtyRaw: qtyNeededRaw, unitRaw: ingredient.unit || stockUnit, qtyStock: qtyInStockUnit, stockUnit };

        if (pool.custody + 1e-9 < qtyInStockUnit) {
          const hint = pool.unreleasedReserved > 0
            ? ` (${pool.unreleasedReserved} ${stockUnit} still reserved on an unreleased requisition batch)`
            : '';
          shortages.push(`${ingredient.inventory_item_name || pool.inv.name}: need ${qtyInStockUnit} ${stockUnit} (${qtyNeededRaw} ${ingredient.unit || stockUnit}) in event kitchen custody, available ${pool.custody} ${stockUnit}${hint}`);
        }
      } else {
        const { inv: invItem, free, stockUnit } = await freeStock(db, itemId, order.id, rules);
        invItems[itemId] = invItem;
        if (!invItem) {
          shortages.push(`${ingredient.inventory_item_name || 'Unknown ingredient'}: item not found in inventory`);
          continue;
        }
        const conv = toStockQuantity(qtyNeededRaw, ingredient.unit || stockUnit, invItem, rules);
        if (!conv.ok) {
          shortages.push(`${ingredient.inventory_item_name || invItem.name}: ${conv.message}`);
          continue;
        }
        const qtyInStockUnit = conv.quantity;
        resolvedNeeds[itemId] = { qtyRaw: qtyNeededRaw, unitRaw: ingredient.unit || stockUnit, qtyStock: qtyInStockUnit, stockUnit };

        if (free + 1e-9 < qtyInStockUnit) {
          shortages.push(`${ingredient.inventory_item_name || invItem.name}: need ${qtyInStockUnit} ${stockUnit} (${qtyNeededRaw} ${ingredient.unit || stockUnit}), available ${free} ${stockUnit}`);
        }
      }
    }
    if (shortages.length > 0) {
      return Response.json({
        error: isCateringCustody
          ? `Insufficient event kitchen custody stock: ${shortages.join(' | ')}`
          : `Insufficient raw materials: ${shortages.join(' | ')}`,
        shortages
      }, { status: 400 });
    }

    const outputItemId = localize ? await localize(recipe.output_item_id) : recipe.output_item_id;
    const accountingMovement = await prepareProductionInventory(base44,user,{order,recipe,invItems,itemIdOf,resolvedNeeds,byOutput,rules,actualOutput,outputItemId});
    // Deduct raw ingredients in converted stock units and calculate unit-converted cost.
    const ingredientsConsumed = [];
    const subConsumption = [];
    const movementRows = [];
    const batchLabel = `Production · ${recipe.name || order.recipe_name || 'batch'}`;
    let totalCost = 0;

    for (const ingredient of (recipe.ingredients || [])) {
      const qtyNeededRaw = (Number(ingredient.quantity_needed) || 0) * batches;
      if (qtyNeededRaw <= 0) continue;
      const itemId = itemIdOf[ingredient.inventory_item_id];
      const invItem = invItems[itemId];
      if (!invItem) continue;
      const needInfo = resolvedNeeds[itemId];
      const qtyInStockUnit = needInfo ? needInfo.qtyStock : qtyNeededRaw;

      const sub = byOutput[ingredient.inventory_item_id];
      const subFallbackCost = sub ? (Number(sub.total_cost) || 0) / (Number(sub.output_quantity) || 1) : null;
      const costRes = computeIngredientCost(qtyNeededRaw, ingredient.unit || needInfo?.stockUnit, invItem, rules, subFallbackCost);
      const cost = costRes.ok ? costRes.totalCost : (invItem.cost_per_unit || 0) * qtyInStockUnit;
      totalCost += cost;

      if (isCateringCustody) {
        let toConsumeInStock = qtyInStockUnit;
        const pool = custodyPools[itemId];
        for (const row of (pool?.custodyRows || [])) {
          if (toConsumeInStock <= 0) break;
          const takeStock = Math.min(row.remaining, toConsumeInStock);
          const factor = row.toStockFactor || 1;
          const takeRaw = takeStock / factor;
          const newCustodyRaw = Math.max(0, Math.round((row.remainingRaw - takeRaw) * 10000) / 10000);
          const newConsumedRaw = Math.round(((Number(row.reservation.custody_consumed_quantity) || 0) + takeRaw) * 10000) / 10000;
          await db.CateringReservation.update(row.reservation.id, {
            custody_quantity: newCustodyRaw,
            custody_consumed_quantity: newConsumedRaw,
          });
          toConsumeInStock -= takeStock;
        }
        for (const subRow of (pool?.subCustodyRows || [])) {
          if (toConsumeInStock <= 0) break;
          const takeStock = Math.min(subRow.remaining, toConsumeInStock);
          const factor = subRow.toStockFactor || 1;
          const takeRaw = takeStock / factor;
          const newSubCustodyRaw = Math.max(0, Math.round((subRow.remainingRaw - takeRaw) * 10000) / 10000);
          await db.ProductionOrder.update(subRow.order.id, {
            custody_output_quantity: newSubCustodyRaw,
          });
          toConsumeInStock -= takeStock;
        }
      } else {
        const newQty = Math.max(0, Math.round(((Number(invItem.quantity) || 0) - qtyInStockUnit) * 10000) / 10000);
        await base44.entities.InventoryItem.update(itemId, {
          quantity: newQty
        });
        movementRows.push(movementRow(invItem, {
          key: `production_consumption:${production_order_id}:${itemId}:${ingredientsConsumed.length}`, direction: 'out', type: 'production_consumption',
          quantity: qtyInStockUnit, unit: needInfo?.stockUnit, before: Number(invItem.quantity) || 0, after: newQty, cost_impact: cost,
          source_entity: 'ProductionOrder', source_id: production_order_id, source_label: batchLabel,
          event_id: order.catering_event_id, event_name: order.catering_event_name, actor_email: user.email,
        }, rules));
      }

      ingredientsConsumed.push({
        inventory_item_id: itemId,
        inventory_item_name: ingredient.inventory_item_name || invItem.name,
        quantity_consumed: qtyNeededRaw,
        unit: ingredient.unit || invItem.selling_unit_label || invItem.unit,
        stock_quantity_consumed: qtyInStockUnit,
        stock_unit: needInfo?.stockUnit || getItemStockUnit(invItem),
        cost: Math.round(cost * 10000) / 10000
      });
      if (sub && sub.id !== recipe.id) {
        subConsumption.push({ ...ingredientsConsumed[ingredientsConsumed.length - 1], source_recipe_id: sub.id, source_recipe_name: sub.name });
      }
    }

    totalCost = Math.round(totalCost * 10000) / 10000;

    // Add finished goods: for event-linked catering batches, finished output remains in event custody
    // (never added to general shelf InventoryItem.quantity).
    if (outputItemId) {
      const outputItem = await base44.entities.InventoryItem.get(outputItemId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (outputItem) {
        const outStockUnit = getItemStockUnit(outputItem);
        const outConv = convertQuantity(actualOutput, recipe.output_unit || outStockUnit, outStockUnit, {
          item: outputItem,
          itemId: outputItem.id,
          rules,
        });
        const actualOutputInStockUnit = outConv.ok ? outConv.quantity : actualOutput;

        if (isCateringCustody) {
          const unitCost = actualOutputInStockUnit > 0 && totalCost > 0
            ? Math.round((totalCost / actualOutputInStockUnit) * 10000) / 10000
            : (outputItem.cost_per_unit || 0);
          if (actualOutputInStockUnit > 0 && totalCost > 0) {
            await base44.entities.InventoryItem.update(outputItemId, {
              cost_per_unit: unitCost,
              ...(expiry_date ? { expiry_date } : {})
            });
          }
        } else {
          const oldQty = Math.max(0, outputItem.quantity || 0);
          const newQty = Math.round((oldQty + actualOutputInStockUnit) * 10000) / 10000;
          const unitCost = newQty > 0
            ? (oldQty * (outputItem.cost_per_unit || 0) + totalCost) / newQty
            : (outputItem.cost_per_unit || 0);
          await base44.entities.InventoryItem.update(outputItemId, {
            quantity: newQty,
            ...(actualOutputInStockUnit > 0 && totalCost > 0 ? { cost_per_unit: Math.round(unitCost * 10000) / 10000 } : {}),
            ...(expiry_date ? { expiry_date } : {})
          });
          movementRows.push(movementRow({ ...outputItem, cost_per_unit: Math.round(unitCost * 10000) / 10000 }, {
            key: `production_output:${production_order_id}`, direction: 'in', type: 'production_output',
            quantity: actualOutputInStockUnit, unit: outStockUnit, before: oldQty, after: newQty, cost_impact: totalCost,
            source_entity: 'ProductionOrder', source_id: production_order_id, source_label: batchLabel, actor_email: user.email,
          }, rules));
        }
      }
    }

    // Update the production order (and advance prep_stage to 'ready' if still in an earlier kitchen stage)
    const nextPrepStage =
      order.prep_stage === 'handed_off' ? 'handed_off' : 'ready';
    const updated = await base44.entities.ProductionOrder.update(production_order_id, {
      status: 'completed',
      ...(resolution.source === 'output_item_id' && recipe.id !== order.recipe_id
        ? { recipe_id: recipe.id }
        : {}),
      actual_output_quantity: actualOutput,
      ...(isCateringCustody ? { custody_output_quantity: actualOutput, prep_stage: nextPrepStage } : {}),
      total_cost: totalCost,
      ingredients_consumed: ingredientsConsumed,
      sub_recipe_consumption: subConsumption,
      completed_by: user.email,
      completed_date: new Date().toISOString(),
      waste_note: waste_note || ''
    });

    if(accountingMovement) await db.InventoryAccountingMovement.update(accountingMovement.id,{status:'applied'});
    await recordMovements(db, movementRows);
    // Audit log
    await base44.entities.AuditLog.create({
      admin_id: user.id,
      admin_email: user.email,
      action_type: 'update',
      entity_type: 'ProductionOrder',
      entity_id: production_order_id,
      entity_name: order.recipe_name || 'Production Order',
      action_description: `Completed production order for ${batches} batch(es) of ${recipe.name} (${resolution.source}). Output: ${actualOutput} ${recipe.output_unit || ''}${isCateringCustody ? ' in event custody' : ''}. Cost: ${totalCost.toFixed(2)}`,
      changes: {
        status: { from: order.status, to: 'completed' },
        recipe_resolution: resolution.source,
        actual_output: actualOutput,
        ...(isCateringCustody ? { custody_output_quantity: actualOutput } : {}),
        total_cost: totalCost,
      },
      status: 'success'
    });

    return Response.json({
      success: true,
      order: updated,
      total_cost: totalCost,
      ingredients_consumed: ingredientsConsumed.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}