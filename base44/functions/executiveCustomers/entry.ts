import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { executiveContext } from '../../shared/executiveAccess.js';
import { customersLeads } from '../../shared/executiveCustomersLeads.js';
import { customersClients } from '../../shared/executiveCustomersClients.js';
import { customersCare } from '../../shared/executiveCustomersCare.js';

// Executive Dashboard Customers & growth figures, totalled on the server per action.
const REPORTS = { leads: customersLeads, clients: customersClients, care: customersCare };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await executiveContext(base44);
    const input = (await req.json().catch(() => null)) || {};
    if (!Object.hasOwn(REPORTS, input.action)) return Response.json({ error: 'Unknown customers report.' }, { status: 400 });
    return Response.json(await REPORTS[input.action](ctx, input));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Executive customers figures failed:', error.message);
    return Response.json({ error: error.message }, { status });
  }
}