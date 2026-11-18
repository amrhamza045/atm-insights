import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { getCompanyOffset, TIMEZONE_MISSING, dayWindow, dayInOffset } from '../_shared/companyTimezone.js';
import { saveBranchSummaries, summaryFields } from '../_shared/dailySummaryBranches.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const denied = await denyUnlessPermitted(base44, user, 'financial_view');
    if (denied) return denied;

    const body = await req.json();
    const { businessDate, sessionId } = body;

    if (!businessDate) {
      return Response.json({ error: 'Business date required' }, { status: 400 });
    }

    // Day boundaries follow the company timezone.
    const offset = await getCompanyOffset(base44.asServiceRole.entities);
    if (offset === null) return Response.json({ error: TIMEZONE_MISSING }, { status: 400 });
    const localDay = (v) => dayInOffset(v, offset);
    const { start: dateStart, end: dateEnd } = dayWindow(businessDate, offset);

    const allOrders = await base44.entities.Order.list();
    const dayOrders = allOrders.filter(o => {
      const orderTime = new Date(o.created_date).getTime();
      return orderTime >= dateStart && orderTime < dateEnd && ['paid', 'completed'].includes(o.status);
    });

    const foodCosts = await base44.entities.FoodCostCalculation.filter({});
    const dayFoodCosts = foodCosts.filter(fc => fc.order_date && localDay(fc.order_date) === businessDate);

    const expenses = await base44.entities.Expense.filter({});
    const dayExpenses = expenses.filter(e => e.expense_date && localDay(e.expense_date) === businessDate);

    // Catering revenue — recorded on CateringPayment records, never on Orders,
    // so it is reported alongside POS revenue without ever being added into it.
    const cateringPayments = await base44.entities.CateringPayment.filter({ status: 'completed' });
    const dayCateringPayments = cateringPayments.filter(p => p.payment_date && localDay(p.payment_date) === businessDate);

    // One summary per branch, built from that branch's records only.
    const build = ({ orders, foodCosts, expenses, payments }) => {
      const base = summaryFields({ orders, foodCosts, expenses });
      const foodRevenue = orders.filter(o => o.items?.some(i => {
        // Assuming we can identify food items
        return i.name?.toLowerCase().includes('food') || !i.name?.toLowerCase().includes('drink');
      })).reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        ...base,
        cashier_session_id: sessionId || null,
        catering_revenue: payments.reduce((sum, p) => sum + (p.payment_type === 'refund' ? -1 : 1) * (p.amount || 0), 0),
        catering_payment_count: payments.length,
        food_revenue: foodRevenue,
        beverage_revenue: base.total_revenue - foodRevenue,
        total_beverage_cost: 0,
        food_cost_percentage: foodRevenue > 0 ? (base.total_food_cost / foodRevenue) * 100 : 0,
        beverage_cost_percentage: 0, // Simplified
      };
    };

    const summaries = await saveBranchSummaries(
      base44.asServiceRole,
      businessDate,
      { orders: dayOrders, foodCosts: dayFoodCosts, expenses: dayExpenses, payments: dayCateringPayments },
      build,
    );

    return Response.json({ success: true, summaries, ordersProcessed: dayOrders.length });
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
