import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { supplierContext, withSupplierLock } from '../_shared/supplierAccountsAccess.js';
import { readSupplierAccounts } from '../_shared/supplierAccountsRead.js';
import { registerSupplierInvoice, supplierInvoice } from '../_shared/supplierAccountReview.js';
import { paySupplier, openSupplierBalance } from '../_shared/supplierAccountMutations.js';
import { requireValue } from '../_shared/financeValidation.js';
import { supplierReturnDetails, previewSupplierReturn, postSupplierReturn } from '../_shared/supplierReturnService.js';
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return Response.json({error: 'Sign in to view supplier accounts.'}, {status: 401});
    const input = await req.json().catch(() => ({}));
    const write = ['review_invoice', 'pay', 'opening', 'return_preview', 'return_supplier'].includes(input.action);
    const ctx = await supplierContext(base44, user, input, write);
    if (input.action === 'return_details') { const {invoice, history} = await supplierReturnDetails(ctx, input); return Response.json({invoice, items: invoice.items.map((line, index) => ({...line, line_index:index, remaining_quantity: Math.max(0, Number(line.quantity) - history.flatMap(e => e.account_snapshot?.items || []).filter(i => i.line_index === index).reduce((n,i) => n + i.quantity, 0))}))}); }
    if (input.action === 'return_preview') return Response.json(await previewSupplierReturn(ctx, input));
    if (!write) return Response.json(await readSupplierAccounts(ctx, input));
    requireValue(['review_invoice', 'pay', 'opening', 'return_supplier'].includes(input.action), 'Unknown action.');
    const result = await withSupplierLock(ctx, async () => {
      if (input.action === 'return_supplier') return postSupplierReturn(ctx, input);
      if (input.action === 'pay') return paySupplier(ctx, input);
      if (input.action === 'opening') return openSupplierBalance(ctx, input);
      return {entry: await registerSupplierInvoice(ctx, await supplierInvoice(ctx, input.invoice_id), {...input, historical: true})};
    });
    return Response.json({success: true, ...result});
  } catch (error) {
    return Response.json({error: error.message}, {status: [400,401,403,404,409].includes(error.status) ? error.status : 500});
  }
}
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
