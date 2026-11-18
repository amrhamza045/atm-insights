import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { executiveContext } from '../../shared/executiveAccess.js';
import { supplyStock } from '../../shared/executiveSupplyStock.js';
import { supplyPurchasing } from '../../shared/executiveSupplyPurchasing.js';
import { supplySuppliers } from '../../shared/executiveSupplySuppliers.js';
import { supplyDishes } from '../../shared/executiveSupplyDishes.js';
import { supplyKitchen } from '../../shared/executiveSupplyKitchen.js';

// Executive Dashboard cost & supply figures, totalled on the server per action.
const REPORTS = { stock: supplyStock, purchasing: supplyPurchasing, suppliers: supplySuppliers, dishes: supplyDishes, kitchen: supplyKitchen };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await executiveContext(base44);
    const input = (await req.json().catch(() => null)) || {};
    if (!Object.hasOwn(REPORTS, input.action)) return Response.json({ error: 'Unknown cost & supply report.' }, { status: 400 });
    return Response.json(await REPORTS[input.action](ctx, input));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Executive cost & supply figures failed:', error.message);
    return Response.json({ error: error.message }, { status });
  }
}