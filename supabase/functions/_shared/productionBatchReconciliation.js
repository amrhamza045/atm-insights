// Deterministic, preview-first reconciliation for an already-completed catering production batch
// whose recipe was missing at completion time (leaving ingredients_consumed empty and event
// kitchen custody untouched). Never double-consumes stock or adds finished output twice.

import { resolveOrderRecipeStrict, recipesByOutput } from './recipeNesting.js';
import {
  loadConversionRules,
  toStockQuantity,
  computeIngredientCost,
  getItemStockUnit,
  convertQuantity,
} from './unitConversion.js';

const round4 = (n) => Math.round((Number(n) || 0) * 10000) / 10000;

function buildFingerprint(order, reservationLines, outputItem) {
  const orderPart = [
    order.id,
    order.status,
    order.updated_date || '',
    order.actual_output_quantity ?? '',
    order.custody_output_quantity ?? '',
    (order.ingredients_consumed || []).length,
  ].join(':');
  const resPart = reservationLines
    .map((r) =>
      [
        r.reservation_id,
        r.status,
        r.quantity_reserved,
        r.actual_quantity ?? '',
        r.custody_before,
        r.consumed_before,
      ].join(':')
    )
    .sort()
    .join('|');
  const outPart = outputItem ? `${outputItem.id}:${outputItem.quantity}:${outputItem.cost_per_unit}` : 'none';
  return `${orderPart}__${resPart}__${outPart}`;
}

export async function buildBatchReconciliationPreview(db, order) {
  if (!order) {
    return {
      status: 'not_found',
      canApply: false,
      blockers: ['Production order not found.'],
    };
  }

  const blockers = [];
  const warnings = [];

  if (order.status !== 'completed') {
    blockers.push(`Batch status is "${order.status}" — only completed batches with missing consumption can be reconciled.`);
  }

  const isCatering = order.order_source === 'catering' && !!order.catering_event_id;
  if (!isCatering) {
    blockers.push('Only event-linked catering batches use event kitchen custody reconciliation.');
  }

  const existingConsumed = Array.isArray(order.ingredients_consumed) ? order.ingredients_consumed : [];
  if (existingConsumed.length > 0) {
    return {
      status: 'already_reconciled',
      canApply: false,
      blockers: [
        `This batch already records ${existingConsumed.length} consumed ingredient(s) (Cost: ${order.total_cost || 0}). Reconciliation is blocked to prevent double consumption.`,
      ],
      order_summary: {
        id: order.id,
        recipe_name: order.recipe_name,
        catering_event_id: order.catering_event_id,
        catering_event_name: order.catering_event_name,
        actual_output_quantity: order.actual_output_quantity,
        custody_output_quantity: order.custody_output_quantity,
        output_unit: order.output_unit,
        total_cost: order.total_cost,
      },
      lines: [],
    };
  }

  const [recipeRes, rules, byOutput, eventReservations, outputItem] = await Promise.all([
    resolveOrderRecipeStrict(db, order),
    loadConversionRules(db),
    recipesByOutput(db),
    order.catering_event_id
      ? db.CateringReservation.filter({ event_id: order.catering_event_id })
      : Promise.resolve([]),
    order.output_item_id
      ? db.InventoryItem.get(order.output_item_id).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Immutable source 1: CateringReservation rows created specifically for this production_order_id
  const directOrderReservations = eventReservations.filter(
    (r) => r.production_order_id === order.id && r.purpose === 'production_input' && r.status !== 'released'
  );

  // Immutable source 2: Unambiguous active recipe for output_item_id (or saved recipe_id)
  const resolvedRecipe = recipeRes.recipe;

  let sourceType = null;
  let sourceLabel = '';
  const plannedInputs = [];

  if (directOrderReservations.length > 0) {
    sourceType = 'batch_reservations';
    sourceLabel = `Immutable event production-input reservations linked to batch ID ${order.id} (${directOrderReservations.length} item(s))`;
    for (const r of directOrderReservations) {
      plannedInputs.push({
        reservation: r,
        inventory_item_id: r.inventory_item_id,
        inventory_item_name: r.inventory_item_name,
        quantity_needed: Number(r.quantity_reserved) || 0,
        unit: r.unit || '',
      });
    }
    if (!resolvedRecipe) {
      warnings.push(
        `Original recipe (${order.recipe_id}) is no longer in the Recipe catalog; reconciling from the ${directOrderReservations.length} immutable production_input reservation record(s) committed to this batch when the event was planned.`
      );
    }
  } else if (resolvedRecipe) {
    sourceType = `recipe_${recipeRes.source}`;
    sourceLabel = `Unambiguous active recipe "${resolvedRecipe.name}" (${recipeRes.source})`;
    const batches = Number(order.target_quantity) || 1;
    for (const ing of resolvedRecipe.ingredients || []) {
      const qtyNeeded = round4((Number(ing.quantity_needed) || 0) * batches);
      if (qtyNeeded <= 0) continue;
      const candidateRes = eventReservations.find(
        (r) =>
          r.inventory_item_id === ing.inventory_item_id &&
          r.purpose === 'production_input' &&
          r.status === 'consumed' &&
          (!r.production_order_id || r.production_order_id === order.id)
      );
      plannedInputs.push({
        reservation: candidateRes || null,
        inventory_item_id: ing.inventory_item_id,
        inventory_item_name: ing.inventory_item_name,
        quantity_needed: qtyNeeded,
        unit: ing.unit || '',
      });
    }
  } else {
    blockers.push(
      'Safe reconciliation cannot be proven: neither batch-linked production_input reservations nor an unambiguous active recipe for the output item exist. Flagged for manual review.'
    );
  }

  const lines = [];
  let totalCost = 0;

  for (const inp of plannedInputs) {
    const r = inp.reservation;
    const inv = await db.InventoryItem.get(inp.inventory_item_id).catch(() => null);
    const stockUnit = getItemStockUnit(inv) || inp.unit || '';

    if (!inv) {
      blockers.push(`Inventory item "${inp.inventory_item_name || inp.inventory_item_id}" no longer exists.`);
    }
    if (!r) {
      blockers.push(
        `No released kitchen-custody reservation found for ingredient "${inp.inventory_item_name || inp.inventory_item_id}".`
      );
      continue;
    }
    if (r.status !== 'consumed') {
      blockers.push(
        `Reservation for "${inp.inventory_item_name}" has status "${r.status}" (not released into event kitchen custody).`
      );
    }

    const releasedRaw = Number(r.actual_quantity ?? r.quantity_reserved) || 0;
    const consumedBefore = Number(r.custody_consumed_quantity) || 0;
    const custodyBefore =
      r.custody_quantity != null
        ? Number(r.custody_quantity)
        : Math.max(0, round4(releasedRaw - consumedBefore));

    if (consumedBefore > 0 && r.production_order_id === order.id) {
      blockers.push(
        `Reservation for "${inp.inventory_item_name}" already has custody_consumed_quantity = ${consumedBefore} ${r.unit || stockUnit}. Blocked to prevent double consumption.`
      );
    }

    const toConsumeRaw = round4(inp.quantity_needed);
    if (custodyBefore + 1e-9 < toConsumeRaw) {
      blockers.push(
        `Insufficient remaining custody for "${inp.inventory_item_name}": need ${toConsumeRaw} ${inp.unit || stockUnit}, but only ${custodyBefore} ${r.unit || stockUnit} remains in custody.`
      );
    }

    const conv = inv
      ? toStockQuantity(toConsumeRaw, inp.unit || stockUnit, inv, rules)
      : { ok: true, quantity: toConsumeRaw };
    if (!conv.ok) {
      blockers.push(`Unit conversion failed for "${inp.inventory_item_name}": ${conv.message}`);
    }
    const qtyInStockUnit = conv.ok ? conv.quantity : toConsumeRaw;

    const sub = byOutput[inp.inventory_item_id];
    const subFallbackCost = sub
      ? (Number(sub.total_cost) || 0) / (Number(sub.output_quantity) || 1)
      : null;
    const costRes = inv
      ? computeIngredientCost(toConsumeRaw, inp.unit || stockUnit, inv, rules, subFallbackCost)
      : { ok: false };
    const lineCost = costRes.ok
      ? round4(costRes.totalCost)
      : round4((Number(inv?.cost_per_unit) || 0) * qtyInStockUnit);
    totalCost = round4(totalCost + lineCost);

    const custodyAfter = Math.max(0, round4(custodyBefore - toConsumeRaw));
    const consumedAfter = round4(consumedBefore + toConsumeRaw);

    lines.push({
      reservation_id: r.id,
      inventory_item_id: inp.inventory_item_id,
      inventory_item_name: inp.inventory_item_name || inv?.name || 'Unknown',
      unit: inp.unit || r.unit || stockUnit,
      stock_unit: stockUnit,
      status: r.status,
      quantity_reserved: Number(r.quantity_reserved) || 0,
      actual_quantity: releasedRaw,
      custody_before: custodyBefore,
      consumed_before: consumedBefore,
      to_consume: toConsumeRaw,
      to_consume_stock_unit: round4(qtyInStockUnit),
      custody_after: custodyAfter,
      consumed_after: consumedAfter,
      unit_cost: Number(inv?.cost_per_unit) || 0,
      line_cost: lineCost,
      is_sub_recipe: !!(sub && sub.id !== order.recipe_id),
      source_recipe_id: sub?.id || null,
      source_recipe_name: sub?.name || null,
    });
  }

  const actualOutput =
    order.actual_output_quantity != null
      ? Number(order.actual_output_quantity)
      : Number(order.required_output_quantity) || 0;
  const currentCustodyOutput =
    order.custody_output_quantity != null ? Number(order.custody_output_quantity) : null;
  const targetCustodyOutput = currentCustodyOutput != null ? currentCustodyOutput : actualOutput;
  const outputDelta = round4(targetCustodyOutput - (currentCustodyOutput ?? 0));

  let newOutputUnitCost = outputItem?.cost_per_unit ?? null;
  if (outputItem && actualOutput > 0 && totalCost > 0) {
    const outStockUnit = getItemStockUnit(outputItem);
    const outConv = convertQuantity(actualOutput, order.output_unit || outStockUnit, outStockUnit, {
      item: outputItem,
      itemId: outputItem.id,
      rules,
    });
    const outInStock = outConv.ok ? outConv.quantity : actualOutput;
    if (outInStock > 0) {
      newOutputUnitCost = round4(totalCost / outInStock);
    }
  }

  const canApply = blockers.length === 0 && lines.length > 0;
  const fingerprint = buildFingerprint(order, lines, outputItem);

  return {
    status: canApply ? 'ready' : 'manual_review_required',
    canApply,
    fingerprint,
    source_type: sourceType,
    source_label: sourceLabel,
    recipe_resolution: {
      found: !!resolvedRecipe,
      source: recipeRes.source,
      recipe_id: resolvedRecipe?.id || null,
      recipe_name: resolvedRecipe?.name || null,
      error: recipeRes.error,
    },
    blockers,
    warnings,
    order_summary: {
      id: order.id,
      recipe_id: order.recipe_id,
      recipe_name: order.recipe_name,
      output_item_id: order.output_item_id,
      output_item_name: order.output_item_name || outputItem?.name || '',
      output_unit: order.output_unit || '',
      target_quantity: order.target_quantity,
      required_output_quantity: order.required_output_quantity,
      actual_output_quantity: actualOutput,
      custody_output_before: currentCustodyOutput,
      custody_output_after: targetCustodyOutput,
      output_custody_delta: outputDelta,
      shelf_inventory_quantity: outputItem ? Number(outputItem.quantity) || 0 : null,
      shelf_inventory_delta: 0,
      output_unit_cost_before: outputItem ? Number(outputItem.cost_per_unit) || 0 : null,
      output_unit_cost_after: newOutputUnitCost,
      total_cost_before: Number(order.total_cost) || 0,
      total_cost_after: totalCost,
      catering_event_id: order.catering_event_id,
      catering_event_name: order.catering_event_name,
      completed_by: order.completed_by,
      completed_date: order.completed_date,
    },
    lines,
  };
}

export async function applyBatchReconciliation(db, order, user, expectedFingerprint) {
  const preview = await buildBatchReconciliationPreview(db, order);
  if (!preview.canApply) {
    return {
      ok: false,
      status: 400,
      error: preview.blockers[0] || 'Safe reconciliation cannot be proven; batch remains unchanged for manual review.',
      preview,
    };
  }
  if (expectedFingerprint && expectedFingerprint !== preview.fingerprint) {
    return {
      ok: false,
      status: 409,
      error: 'Source records changed since the preview was loaded. Please review the updated preview and try again.',
      preview,
    };
  }

  // 1. Update each source CateringReservation custody record
  for (const line of preview.lines) {
    await db.CateringReservation.update(line.reservation_id, {
      custody_quantity: line.custody_after,
      custody_consumed_quantity: line.consumed_after,
    });
  }

  // 2. Build ingredients_consumed & sub_recipe_consumption for ProductionOrder
  const ingredientsConsumed = preview.lines.map((l) => ({
    inventory_item_id: l.inventory_item_id,
    inventory_item_name: l.inventory_item_name,
    quantity_consumed: l.to_consume,
    unit: l.unit,
    stock_quantity_consumed: l.to_consume_stock_unit,
    stock_unit: l.stock_unit,
    cost: l.line_cost,
  }));

  const subConsumption = preview.lines
    .filter((l) => l.is_sub_recipe)
    .map((l) => ({
      inventory_item_id: l.inventory_item_id,
      inventory_item_name: l.inventory_item_name,
      source_recipe_id: l.source_recipe_id,
      source_recipe_name: l.source_recipe_name,
      quantity_consumed: l.to_consume,
      unit: l.unit,
      cost: l.line_cost,
    }));

  // 3. Update output item unit cost (never general shelf quantity)
  const outSummary = preview.order_summary;
  if (
    order.output_item_id &&
    outSummary.output_unit_cost_after != null &&
    outSummary.total_cost_after > 0
  ) {
    await db.InventoryItem.update(order.output_item_id, {
      cost_per_unit: outSummary.output_unit_cost_after,
    });
  }

  // 4. Update ProductionOrder without adding output twice
  const updatedOrder = await db.ProductionOrder.update(order.id, {
    custody_output_quantity: outSummary.custody_output_after,
    total_cost: outSummary.total_cost_after,
    ingredients_consumed: ingredientsConsumed,
    sub_recipe_consumption: subConsumption,
    ...(preview.recipe_resolution.recipe_id && preview.recipe_resolution.recipe_id !== order.recipe_id
      ? { recipe_id: preview.recipe_resolution.recipe_id }
      : {}),
  });

  // 5. Record immutable AuditLog entry
  await db.AuditLog.create({
    admin_id: user.id,
    admin_email: user.email,
    action_type: 'update',
    entity_type: 'ProductionOrder',
    entity_id: order.id,
    entity_name: order.recipe_name || 'Production Order',
    action_description: `Reconciled event kitchen custody & cost for completed catering batch "${order.recipe_name}" (${order.catering_event_name || order.catering_event_id}). Consumed ${ingredientsConsumed.length} custody input(s), cost EGP ${outSummary.total_cost_after.toFixed(2)}, output in event custody kept at ${outSummary.custody_output_after} ${outSummary.output_unit} (general shelf inventory untouched).`,
    changes: {
      source_type: preview.source_type,
      fingerprint: preview.fingerprint,
      total_cost: { from: outSummary.total_cost_before, to: outSummary.total_cost_after },
      custody_output_quantity: {
        from: outSummary.custody_output_before,
        to: outSummary.custody_output_after,
      },
      shelf_inventory_delta: 0,
      reconciled_lines: preview.lines.map((l) => ({
        reservation_id: l.reservation_id,
        item: l.inventory_item_name,
        custody_before: l.custody_before,
        custody_after: l.custody_after,
        consumed: l.to_consume,
        unit: l.unit,
        cost: l.line_cost,
      })),
    },
    status: 'success',
  });

  return {
    ok: true,
    order: updatedOrder,
    reconciled_lines: preview.lines,
    total_cost: outSummary.total_cost_after,
    custody_output_quantity: outSummary.custody_output_after,
    shelf_inventory_delta: 0,
  };
}