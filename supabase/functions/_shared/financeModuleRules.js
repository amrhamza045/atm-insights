import { requireValue, moneyUnits, validDate } from './financeValidation.js';
import { branchQuery } from './financeAccess.js';
import { methodFor } from './financePaymentMethodSource.js';
export async function noLinkedLegacy(ctx,company,s){requireValue(!await ctx.svc.entities.JournalEntry.count({...branchQuery(ctx,company),reference_id:s.id,posted:true}),'A posted operational journal already references this source. Reconcile that journal through Historical reconstruction instead of creating a duplicate.',409);}
export async function noModuleDuplicate(ctx,company,s){if(!s.reference_id)return;const query={company_id:company.id,source_entity:{$nin:['JournalEntry','FinanceJournal']},source_id:s.reference_id};const [posted,pending]=await Promise.all([ctx.svc.entities.FinanceJournal.count({...query,status:'posted'}),ctx.svc.entities.FinanceProposal.count({...query,status:'pending'})]);requireValue(!posted&&!pending,'The referenced transaction already has a module posting or pending proposal. Reconcile it before importing this operational journal.',409);}
// Collections are not here: they post to the account of the payment method used (Payment methods).
export const MODULE_ACCOUNTS={sales:'revenue',tax:'liabilities',service:'revenue',delivery:'revenue',inventory:'assets',suppliers:'liabilities'};
export function moduleSnapshot(entity,s) {
 const keys=entity==='Order'?['branch_id','total','tax','service_charge','delivery_fee','payment_method','visa_amount','secondary_payment_method','secondary_amount','cashback_used','recharge_balance_deducted','split_check','stripe_payment_status']:['branch_id','supplier_id','invoice_date','items','total_amount'];
 return Object.fromEntries(keys.map(k=>[k,s[k]??null]));
}
export function buildModuleJournal(company,entity,s,date,{confirmedPaid=false,methods=[]}={}) {
 requireValue(['Order','PurchaseInvoice'].includes(entity),'Unsupported transaction source.');requireValue(validDate(date),'Confirm the original payment date before reconstructing a sale.');
 const scale=10**company.currency_decimals,u=v=>moneyUnits(v??0,company.currency_decimals),map=company.module_policy?.map||{},lines=[];
 const push=(account_id,debit,credit)=>{if(!debit&&!credit)return;lines.push({account_id,debit:debit/scale,credit:credit/scale,cost_center:s.branch_id,channel:entity==='Order'?s.order_type:'purchasing',product_reference:s.id,counterparty_reference:entity==='Order'?s.customer_id:s.supplier_id});};
 const add=(role,debit,credit)=>{if(!debit&&!credit)return;requireValue(map[role],`Map the ${role} account before posting.`);push(map[role],debit,credit);};
 if(entity==='Order') {
  requireValue(['paid','completed'].includes(s.status),'The order is not paid or completed.');requireValue(s.status==='paid'||confirmedPaid,'Completed is not proof of payment; confirm payment against supporting records.');
  requireValue(!u(s.cashback_used)&&s.payment_method!=='cashback_balance'&&s.payment_method!=='recharge_balance'&&!u(s.recharge_balance_deducted),'Loyalty-funded sales require the loyalty integration; this sale has not been posted.');
  requireValue(!s.split_check?.enabled,'Guest split checks require payment-level reconciliation; this sale has not been posted.');
  const total=u(s.total),tax=u(s.tax),service=u(s.service_charge),delivery=u(s.delivery_fee);requireValue(total>0&&total>=tax+service+delivery,'Sale totals do not reconcile.');
  const payment=(method,amount)=>{requireValue(['cash','visa','instapay','wallet','stripe'].includes(method),'Credit, hospitality or unknown methods are not confirmed cash collections.');if(method==='stripe')requireValue(s.stripe_payment_status==='succeeded','Stripe payment is not confirmed.');const m=methodFor(methods,method);requireValue(m,`Add "${method}" as a payment method, or as an older code of one, in Finance › Mapping Accounts › Payment methods before posting sales.`);push(m.account_id,amount,0);};
  if(['visa_cash','visa_instapay'].includes(s.payment_method)){const visa=u(s.visa_amount),secondary=u(s.secondary_amount),method=s.payment_method==='visa_cash'?'cash':'instapay';requireValue(visa>0&&secondary>0&&visa+secondary===total&&(!s.secondary_payment_method||s.secondary_payment_method===method),'Split payment amounts or methods do not reconcile.');payment('visa',visa);payment(method,secondary);}else payment(s.payment_method,total);
  add('sales',0,total-tax-service-delivery);add('tax',0,tax);add('service',0,service);add('delivery',0,delivery);
 }else {
  requireValue(s.status==='posted','Only explicitly posted invoices can be imported. Legacy invoices without posting status need reconciliation first.');requireValue(s.supplier_id,'Supplier is missing.');requireValue(Array.isArray(s.items)&&s.items.length,'Invoice lines are missing.');
  let total=0;for(const line of s.items){requireValue(line.inventory_item_id,'Every purchase line must identify inventory.');const qty=Number(line.quantity),price=Number(line.purchase_price);requireValue(Number.isFinite(qty)&&qty>0&&Number.isFinite(price)&&price>=0,'Invalid invoice quantity or price.');const expected=Math.round(qty*price*scale);const amount=u(line.total_cost);requireValue(Math.abs(expected-amount)<=1,'Invoice line quantity, price and stored cost do not reconcile.');total+=amount;}
  // B08: freight on the invoice is capitalized into inventory and owed to the supplier.
  const freight=u(s.freight_amount);requireValue(total>0&&total+freight===u(s.total_amount),'Invoice total does not reconcile to its stored line costs and freight.');add('inventory',total+freight,0);add('suppliers',0,total+freight);
 }
 return {entry_date:date,description:`${entity==='Order'?'Paid sale':'Posted supplier invoice'} · ${s.invoice_number||s.id}`,lines,source_snapshot:moduleSnapshot(entity,s)};
}