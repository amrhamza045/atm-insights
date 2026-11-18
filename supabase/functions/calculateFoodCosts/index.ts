import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { loadConversionRules, computeIngredientCost } from '../_shared/unitConversion.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, ['menu_edit', 'inventory_edit']);
    if (denied) return denied;

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return Response.json({ error: 'Order ID required' }, { status: 400 });
    }

    // Get the order
    const order = (await base44.entities.Order.filter({ id: orderId }))[0];
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const unitRules = await loadConversionRules(base44.asServiceRole);

    // Calculate food cost for each item
    const foodCostCalculations = [];

    for (const item of order.items || []) {
      // Get menu item with recipe
      const menuItem = (await base44.entities.MenuItem.filter({ id: item.menu_item_id }))[0];
      if (!menuItem) continue;

      // Calculate recipe cost
      let totalRecipeCost = 0;
      const recipeItems = [];

      if (menuItem.recipe && menuItem.recipe.length > 0) {
        for (const ingredient of menuItem.recipe) {
          const inventoryItem = (await base44.entities.InventoryItem.filter({ 
            id: ingredient.inventory_item_id 
          }))[0];

          if (inventoryItem) {
            const quantityNeeded = (ingredient.quantity_needed || 0) * item.quantity;
            const ingUnit = ingredient.unit || inventoryItem.selling_unit_label || inventoryItem.unit || '';
            const costRes = computeIngredientCost(quantityNeeded, ingUnit, inventoryItem, unitRules);
            const unitCost = costRes.ok ? costRes.unitCost : (inventoryItem.cost_per_unit || 0);
            const ingredientCost = costRes.ok ? costRes.totalCost : quantityNeeded * unitCost;
            totalRecipeCost += ingredientCost;

            recipeItems.push({
              inventory_item_id: ingredient.inventory_item_id,
              inventory_item_name: inventoryItem.name,
              quantity_used: quantityNeeded,
              unit: ingUnit,
              unit_cost: unitCost,
              total_cost: ingredientCost
            });
          }
        }
      }

      const totalSellingPrice = item.price * item.quantity;
      const foodCostPercentage = totalSellingPrice > 0 ? (totalRecipeCost / totalSellingPrice) * 100 : 0;
      const contributionMargin = item.price - (totalRecipeCost / item.quantity);

      // Create food cost calculation record
      const calculation = {
        order_id: orderId,
        order_date: order.created_date,
        menu_item_id: item.menu_item_id,
        menu_item_name: item.name,
        menu_item_category: menuItem.category,
        quantity_ordered: item.quantity,
        selling_price: item.price,
        total_selling_price: totalSellingPrice,
        recipe_items: recipeItems,
        total_food_cost: totalRecipeCost,
        food_cost_percentage: foodCostPercentage,
        contribution_margin: contributionMargin,
        contribution_margin_percentage: item.price > 0 ? (contributionMargin / item.price) * 100 : 0
      };

      foodCostCalculations.push(calculation);
      
      // Save to database
      await base44.entities.FoodCostCalculation.create(calculation);
    }

    return Response.json({ 
      success: true,
      calculations: foodCostCalculations,
      totalFoodCost: foodCostCalculations.reduce((sum, c) => sum + c.total_food_cost, 0)
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
