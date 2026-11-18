import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const denied = await denyUnlessPermitted(base44, user, 'financial_view');
    if (denied) return denied;

    const body = await req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return Response.json({ error: 'Start and end dates required' }, { status: 400 });
    }

    // Get all menu items
    const menuItems = await base44.entities.MenuItem.list();
    const dateStart = new Date(startDate).getTime();
    const dateEnd = new Date(endDate).getTime();

    // Get all food costs in period
    const allFoodCosts = await base44.entities.FoodCostCalculation.filter({});
    const periodFoodCosts = allFoodCosts.filter(fc => {
      const fcTime = new Date(fc.order_date).getTime();
      return fcTime >= dateStart && fcTime <= dateEnd;
    });

    // Group by menu item
    const itemAnalysis = {};

    for (const menuItem of menuItems) {
      const itemCosts = periodFoodCosts.filter(fc => fc.menu_item_id === menuItem.id);

      if (itemCosts.length === 0) continue;

      const unitsSold = itemCosts.reduce((sum, fc) => sum + fc.quantity_ordered, 0);
      const totalRevenue = itemCosts.reduce((sum, fc) => sum + fc.total_selling_price, 0);
      const totalFoodCost = itemCosts.reduce((sum, fc) => sum + fc.total_food_cost, 0);
      const totalContribution = totalRevenue - totalFoodCost;

      const avgFoodCost = unitsSold > 0 ? (totalFoodCost / unitsSold) : 0;
      const avgFoodCostPct = totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0;
      const avgContributionMarginPct = menuItem.price > 0 ? ((menuItem.price - avgFoodCost) / menuItem.price) * 100 : 0;

      // Determine profitability status
      let profitabilityStatus = 'untracked';
      if (avgFoodCostPct < 25) profitabilityStatus = 'high_profit';
      else if (avgFoodCostPct < 35) profitabilityStatus = 'medium_profit';
      else if (avgFoodCostPct < 45) profitabilityStatus = 'low_profit';
      else profitabilityStatus = 'loss';

      // Recommended action
      let recommendedAction = '';
      if (avgFoodCostPct > 40) {
        recommendedAction = 'Consider price increase or recipe optimization to reduce costs';
      } else if (unitsSold < 5 && avgFoodCostPct < 20) {
        recommendedAction = 'High-margin item with low sales - consider promotions';
      }

      const analysis = {
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        category: menuItem.category,
        item_type: menuItem.preparation_station || 'other',
        analysis_period_start: startDate,
        analysis_period_end: endDate,
        units_sold: unitsSold,
        selling_price: menuItem.price,
        average_unit_food_cost: avgFoodCost,
        total_revenue: totalRevenue,
        total_food_cost: totalFoodCost,
        total_contribution: totalContribution,
        average_food_cost_percentage: avgFoodCostPct,
        average_contribution_margin_percentage: avgContributionMarginPct,
        profitability_status: profitabilityStatus,
        menu_mix_percentage: 0, // Will be calculated after
        recommended_action: recommendedAction
      };

      itemAnalysis[menuItem.id] = analysis;
    }

    // Calculate menu mix percentage
    const totalUnitsSold = Object.values(itemAnalysis).reduce((sum, a) => sum + a.units_sold, 0);
    for (const id in itemAnalysis) {
      itemAnalysis[id].menu_mix_percentage = totalUnitsSold > 0 
        ? (itemAnalysis[id].units_sold / totalUnitsSold) * 100 
        : 0;
    }

    // Save analyses
    for (const analysis of Object.values(itemAnalysis)) {
      const existing = (await base44.entities.MenuProfitabilityAnalysis.filter({
        menu_item_id: analysis.menu_item_id,
        analysis_period_start: startDate
      }))[0];

      if (existing) {
        await base44.entities.MenuProfitabilityAnalysis.update(existing.id, analysis);
      } else {
        await base44.entities.MenuProfitabilityAnalysis.create(analysis);
      }
    }

    return Response.json({
      success: true,
      itemsAnalyzed: Object.keys(itemAnalysis).length,
      analyses: Object.values(itemAnalysis)
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
