import { requireValue } from './financeValidation.js';

// Purchase orders identify the invoice; they are not a second posting source.
export async function auditPurchaseOrders(ctx,def,sources,branches){
 const byInvoice=new Map();
 if(def.entity!=='PurchaseInvoice'||!sources.length)return byInvoice;
 const page=await ctx.svc.entities.PurchaseOrder.filter({...branches,purchase_recorded_invoice_id:{$in:sources.map(s=>s.id)}},{limit:250});
 requireValue(!page.has_more,'Too many linked purchase orders; narrow the audit date range.');
 for(const order of page.items){
  const refs=byInvoice.get(order.purchase_recorded_invoice_id)||[];
  refs.push({id:order.id,order_number:order.order_number});
  byInvoice.set(order.purchase_recorded_invoice_id,refs);
 }
 return byInvoice;
}