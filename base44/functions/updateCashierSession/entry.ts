import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { checkPermission } from '../../shared/requirePermission.js';

/**
 * The only writer of an open branch cashier session's totals (sales, returns, voids, close).
 * Requires cashier_edit + session branch = caller's branch (platform/central admins skip the
 * branch check). Totals are always recalculated here from stored records.
 * Body: { session_id, action: 'recompute' | 'close', closing_cash?, notes? }
 */
const utc = (ts) => (ts && !ts.endsWith('Z') && !ts.includes('+') ? ts + 'Z' : ts);

async function sessionOrders(svc, session) {
  const open = new Date(utc(session.opening_time)).getTime();
  const close = session.closing_time ? new Date(utc(session.closing_time)).getTime() : Date.now() + 86400000;
  const floor = new Date(session.session_date + 'T00:00:00.000Z').getTime() - 2 * 86400000;
  let all = [];
  for (let skip = 0; ; skip += 200) {
    const batch = await svc.Order.list('-created_date', 200, skip);
    if (!batch?.length) break;
    all = all.concat(batch);
    if (new Date(batch[batch.length - 1].created_date).getTime() < floor || batch.length < 200) break;
  }
  return all.filter((o) => {
    const t = new Date(utc(o.created_date)).getTime();
    return t >= open && t <= close && ['paid', 'completed', 'returned'].includes(o.status);
  });
}

async function computeTotals(svc, session) {
  const sid = session.id;
  const [paid, expenses, purchases, deposits, returns, credits, companies] = await Promise.all([
    sessionOrders(svc, session),
    svc.Expense.filter({ session_id: sid, status: 'approved' }),
    svc.CashierPurchase.filter({ session_id: sid, status: 'approved' }),
    svc.Deposit.filter({ session_id: sid }),
    svc.Return.filter({ session_id: sid }),
    svc.VisaCredit.filter({ session_id: sid }),
    svc.DeliveryCompany.list(),
  ]);
  const sum = (arr, f) => arr.reduce((s, x) => s + (x[f] || 0), 0);

  let cash = 0, card = 0, wallet = 0;
  for (const o of paid) {
    if (o.payment_method === 'visa_cash') { card += o.visa_amount || 0; cash += o.secondary_amount || 0; }
    else if (o.payment_method === 'visa_instapay') { card += o.visa_amount || 0; wallet += o.secondary_amount || 0; }
    else if (['cash', 'cl'].includes(o.payment_method)) cash += o.total || 0;
    else if (['visa', 'card', 'stripe'].includes(o.payment_method)) card += o.total || 0;
    else if (['wallet', 'instapay', 'cashback_balance'].includes(o.payment_method)) wallet += o.total || 0;
  }
  const recharge = sum(paid.filter((o) => o.payment_method === 'recharge_balance'), 'total');

  const breakdown = {};
  for (const v of credits) {
    const co = companies.find((c) => c.id === v.delivery_company_id || c.name === v.delivery_company);
    const b = (breakdown[v.delivery_company] ??= { cash: 0, credit: 0, total: 0, count: 0, commission: 0 });
    b[v.payment_method] = (b[v.payment_method] || 0) + (v.amount || 0);
    b.total += v.amount || 0;
    b.count += 1;
    b.commission += (v.amount || 0) * ((co?.commission_percentage || 0) / 100);
  }
  const deliveryCash = sum(credits.filter((v) => v.payment_method === 'cash'), 'amount');
  const cashExpenses = sum(expenses.filter((e) => e.payment_method === 'cash'), 'amount');
  const cashPurchases = sum(purchases.filter((p) => p.payment_method === 'cash' && p.payment_status !== 'pending_payment'), 'total_amount');
  const cashReturns = sum(returns.filter((r) => r.payment_method === 'cash'), 'refund_amount');

  return {
    totals: {
      total_sales: cash + card + wallet + recharge,
      cash_sales: cash,
      card_sales: card,
      wallet_sales: wallet,
      recharge_balance_sales: recharge,
      total_orders: paid.length,
      total_expenses: cashExpenses,
      total_returns: sum(returns, 'refund_amount'),
      total_delivery_orders: credits.length,
      total_delivery_cash: deliveryCash,
      total_delivery_credit: sum(credits.filter((v) => v.payment_method === 'credit'), 'amount'),
      delivery_breakdown: breakdown,
      total_delivery_commission: Object.values(breakdown).reduce((s, b: any) => s + b.commission, 0),
    },
    expectedCash: (session.opening_cash || 0) + cash + sum(deposits, 'amount') + deliveryCash +
      (session.new_recharge_cash || 0) - cashExpenses - cashPurchases - cashReturns,
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const c = await checkPermission(base44, user, 'cashier_edit');
    if (!c.allowed) return Response.json({ error: c.reason }, { status: c.status });

    const { session_id, action, closing_cash, notes } = await req.json();
    const svc = base44.asServiceRole.entities;
    const session = session_id ? await svc.CashierSession.get(session_id) : null;
    if (!session || session.status !== 'open')
      return Response.json({ error: 'Cashier session is not open' }, { status: 409 });

    const central = user.role === 'admin' || user.perm_is_central_admin === true;
    const userBranch = c.permissions?.branch_id || null;
    if (!central && userBranch && session.branch_id !== userBranch)
      return Response.json({ error: 'Forbidden: session belongs to another branch' }, { status: 403 });

    const { totals, expectedCash } = await computeTotals(svc, session);
    let data: Record<string, unknown> = totals;

    if (action === 'close') {
      const actual = Number(closing_cash);
      if (!Number.isFinite(actual) || actual < 0)
        return Response.json({ error: 'A valid closing cash amount is required' }, { status: 400 });
      const rechargeClients = await svc.Client.filter({ is_recharge_user: true });
      data = {
        ...totals,
        closing_time: new Date().toISOString(),
        closing_cash: actual,
        expected_cash: expectedCash,
        cash_difference: actual - expectedCash,
        recharge_balance_remaining: rechargeClients.reduce((s, x) => s + (x.wallet_balance || 0), 0),
        status: 'closed',
        notes: notes || '',
      };
    } else if (action !== 'recompute') {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    const updated = await svc.CashierSession.update(session_id, data);
    return Response.json({ session: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}