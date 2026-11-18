import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendReport } from '../../shared/reportRecipients.js';
import { guardScheduledJob, anonymousDone } from '../../shared/jobGuard.js';
import { getCompanyOffset, TIMEZONE_MISSING, dayWindow, dayInOffset, companyDay } from '../../shared/companyTimezone.js';
import { saveBranchSummaries, summaryFields } from '../../shared/dailySummaryBranches.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Phase 5 job guard: signed-in callers need financial_view; no-user calls run
    // only in their slot, once per slot, and get back only done/skipped.
    const guard = await guardScheduledJob(base44, await req.json().catch(() => ({})), {
      key: 'emailDailyFinancialSummary',
      permission: 'financial_view',
      slot: { hour: 'daily_summary_hour' },
    });
    if (guard.denied) return guard.denied;
    if (guard.skipped) return guard.skipped;
    const sr = base44.asServiceRole;

    // Yesterday = the previous calendar day in the company timezone.
    const offset = await getCompanyOffset(sr.entities);
    if (offset === null) return Response.json({ error: TIMEZONE_MISSING }, { status: 400 });
    const businessDate = companyDay(offset, -1);
    const displayDate = new Date(`${businessDate}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    const localDay = (v) => dayInOffset(v, offset);
    // Send time and timezone come from Settings (Schedules + Timezone).
    const sendHour = (await sr.entities.ScheduleSettings.filter({ setting_key: 'schedules' }))[0]?.daily_summary_hour;
    const tzSign = offset < 0 ? '-' : '+';
    const tzAbs = Math.abs(offset);
    const tzLabel = `UTC${tzSign}${String(Math.floor(tzAbs / 60)).padStart(2, '0')}:${String(tzAbs % 60).padStart(2, '0')}`;
    const sendTimeLabel = Number.isFinite(sendHour)
      ? `at ${String(sendHour).padStart(2, '0')}:00 company time (${tzLabel})`
      : `at its scheduled time (company timezone ${tzLabel})`;

    // Fetch all orders and filter to yesterday's paid/completed
    const allOrders = await sr.entities.Order.list('-created_date', 500);
    const { start: dateStart, end: dateEnd } = dayWindow(businessDate, offset);

    const dayOrders = allOrders.filter(o => {
      const orderTime = new Date(o.created_date).getTime();
      return orderTime >= dateStart && orderTime < dateEnd && ['paid', 'completed'].includes(o.status);
    });

    // Fetch food cost calculations
    const foodCosts = await sr.entities.FoodCostCalculation.filter({});
    const dayFoodCosts = foodCosts.filter(fc => {
      return fc.order_date && localDay(fc.order_date) === businessDate;
    });

    // Fetch expenses
    const expenses = await sr.entities.Expense.filter({});
    const dayExpenses = expenses.filter(e => {
      return e.expense_date && localDay(e.expense_date) === businessDate;
    });

    // Calculate totals
    const totalRevenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalFoodCost = dayFoodCosts.reduce((sum, fc) => sum + (fc.total_food_cost || 0), 0);
    const totalOperatingExpenses = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const laborCost = dayExpenses.filter(e => e.category === 'salaries').reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalCogs = totalFoodCost;
    const grossProfit = totalRevenue - totalCogs;
    const operatingProfit = grossProfit - totalOperatingExpenses;

    const overallCogsPct = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;

    // Dine-in vs delivery vs takeaway breakdown
    const dineInRevenue = dayOrders.filter(o => o.order_type === 'dine_in').reduce((s, o) => s + (o.total || 0), 0);
    const deliveryRevenue = dayOrders.filter(o => o.order_type === 'delivery').reduce((s, o) => s + (o.total || 0), 0);
    const takeawayRevenue = dayOrders.filter(o => o.order_type === 'takeaway').reduce((s, o) => s + (o.total || 0), 0);

    // Payment method breakdown
    const paymentBreakdown = {};
    dayOrders.forEach(o => {
      const method = o.payment_method || 'unknown';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (o.total || 0);
    });

    // Persist one summary row per branch (the email itself still covers all branches).
    await saveBranchSummaries(sr, businessDate, { orders: dayOrders, foodCosts: dayFoodCosts, expenses: dayExpenses }, summaryFields);

    // Build email HTML
    const fmt = (n) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtPct = (n) => (n || 0).toFixed(1) + '%';

    const paymentRows = Object.entries(paymentBreakdown).map(([method, amount]) =>
      `<tr><td style="padding:4px 12px;color:#64748b;text-transform:capitalize">${method.replace(/_/g, ' ')}</td><td style="padding:4px 12px;text-align:right;font-weight:600">EGP ${fmt(amount)}</td></tr>`
    ).join('');

    const emailBody = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px">
        <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 4px">Daily Financial Summary</h1>
          <p style="color:#64748b;margin:0 0 24px">${displayDate}</p>

          <div style="background:#fef3c7;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center">
            <p style="color:#92400e;margin:0 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em">Total Revenue</p>
            <p style="font-size:32px;font-weight:700;color:#0f172a;margin:0">EGP ${fmt(totalRevenue)}</p>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Orders / Covers</td><td style="padding:8px 12px;text-align:right;font-weight:600">${dayOrders.length}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Average Check</td><td style="padding:8px 12px;text-align:right;font-weight:600">EGP ${fmt(dayOrders.length > 0 ? totalRevenue / dayOrders.length : 0)}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Dine-in Revenue</td><td style="padding:8px 12px;text-align:right">EGP ${fmt(dineInRevenue)}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Delivery Revenue</td><td style="padding:8px 12px;text-align:right">EGP ${fmt(deliveryRevenue)}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Takeaway Revenue</td><td style="padding:8px 12px;text-align:right">EGP ${fmt(takeawayRevenue)}</td></tr>
          </table>

          <h2 style="font-size:15px;color:#0f172a;margin:0 0 8px">Profitability</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Food Cost (COGS)</td><td style="padding:8px 12px;text-align:right;font-weight:600;color:#dc2626">EGP ${fmt(totalFoodCost)} (${fmtPct(overallCogsPct)})</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Gross Profit</td><td style="padding:8px 12px;text-align:right;font-weight:600;color:#16a34a">EGP ${fmt(grossProfit)} (${fmtPct(grossMargin)})</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Operating Expenses</td><td style="padding:8px 12px;text-align:right">EGP ${fmt(totalOperatingExpenses)}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b">Labor Cost</td><td style="padding:8px 12px;text-align:right">EGP ${fmt(laborCost)}</td></tr>
            <tr style="border-bottom:1px solid #e2e8f0"><td style="padding:8px 12px;color:#64748b;font-weight:700">Operating Profit</td><td style="padding:8px 12px;text-align:right;font-weight:700;color:${operatingProfit >= 0 ? '#16a34a' : '#dc2626'}">EGP ${fmt(operatingProfit)} (${fmtPct(operatingMargin)})</td></tr>
          </table>

          ${paymentRows ? `<h2 style="font-size:15px;color:#0f172a;margin:0 0 8px">Payment Breakdown</h2><table style="width:100%;border-collapse:collapse;margin-bottom:24px">${paymentRows}</table>` : ''}
        </div>
        <p style="text-align:center;color:#94a3b8;font-size:12px;margin:16px 0 0">This report was generated automatically ${sendTimeLabel}.</p>
      </div>
    `;

    const recipientsSent = await sendReport(sr, 'daily_financial_summary', `Daily Financial Summary — ${displayDate}`, emailBody);

    if (guard.anonymous) return anonymousDone();
    return Response.json({
      success: true,
      recipientsSent,
      businessDate,
      ordersProcessed: dayOrders.length,
      totalRevenue
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});