import { requireValue, validDate } from './financeValidation.js';
import { withFinanceLock } from './financeAccess.js';
import { supplierInvoice, supplierBase } from './supplierAccountReview.js';
import { supplierEntry, supplierPendingGuard } from './supplierAccountsAccess.js';
import { supplierReturnValues, applySupplierReturnStock } from './supplierReturnValues.js';
import { supplierReturnPlan, supplierReturnOriginal } from './supplierReturnPlan.js';
import { finishSupplierJournal } from './supplierAccountJournal.js';
import { loadConversionRules } from './unitConversion.js';
import { audit } from './auditLog.js';
import { moduleSnapshot } from './financeModuleRules.js';
import { openFinanceDate, checkedAccounts } from './financeProposals.js';
export async function supplierReturnDetails(ctx,input){
 const invoice=await supplierInvoice(ctx,input.invoice_id),db=ctx.svc.entities;
 requireValue(invoice.status==='posted','Only explicitly posted purchase invoices can be returned.');
 const charge=await supplierEntry(ctx,`invoice:${invoice.id}`);requireValue(charge?.status==='posted','Review and register the supplier invoice before returning goods.');
 const history=await db.SupplierLedgerEntry.filter({...ctx.query,invoice_id:invoice.id,kind:'supplier_return'},{limit:250});requireValue(!history.has_more,'Return history exceeds safe review limits; accountant reconciliation is required.');
 return {invoice,history:history.items};
}
const returnRequest=input=>({invoice_id:input.invoice_id,entry_date:input.entry_date,notes:String(input.notes||'').trim(),items:input.items});
export async function previewSupplierReturn(ctx,input){
 requireValue(validDate(input.entry_date)&&typeof input.notes==='string'&&input.notes.trim().length>=5&&input.notes.length<=1000,'Choose an accounting date and supplier credit-note reference (5–1000 characters).');
 const {invoice,history}=await supplierReturnDetails(ctx,input);requireValue(input.entry_date>=invoice.invoice_date,'Return date cannot precede the invoice.');
 const ids=[...new Set((invoice.items||[]).map(i=>i.inventory_item_id))];requireValue(ids.length<=100,'Invoice has too many items to return safely.');
 const [stock,rules]=await Promise.all([ctx.svc.entities.InventoryItem.filter({id:{$in:ids},branch_id:ctx.branch},{limit:100}),loadConversionRules(ctx.svc)]);requireValue(!stock.has_more,'Stock evidence exceeds the preview limit.');
 const values=supplierReturnValues(invoice,input.items,new Map(stock.items.map(i=>[i.id,i])),history,rules,ctx.company.currency_decimals);
 const plan=await supplierReturnPlan(ctx,invoice,values,input.entry_date);return {plan,invoice,token:JSON.stringify({...plan,request:returnRequest(input)})};
}
export async function postSupplierReturn(ctx,input){
 const db=ctx.svc.entities,request=returnRequest(input);requireValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.request_key||''),'A valid return submission identifier is required.');
 const key=`supplier-return:${input.request_key}`;await supplierPendingGuard(ctx,[key]);let entry=await supplierEntry(ctx,key);
 if(entry){requireValue(JSON.stringify(entry.account_snapshot.request)===JSON.stringify(request),'Return identifier already used for different details.',409);if(entry.status==='posted')return {entry,already_recorded:true};}
 return withFinanceLock(ctx,ctx.company,async company=>{
  const fresh={...ctx,company};requireValue(!await db.SupplierLedgerEntry.count({company_id:company.id,kind:'supplier_return',status:'pending',...(entry?{id:{$ne:entry.id}}:{})}),'Another supplier return is unfinished; resume it from account history before recording a new one.',409);
  if(!entry){const p=await previewSupplierReturn(fresh,input);requireValue(input.preview_token===p.token&&input.confirmed===true,'Preview changed or confirmation missing. Preview again before returning goods.',409);entry=await db.SupplierLedgerEntry.create(supplierBase(fresh,{entry_key:key,kind:'supplier_return',status:'pending',invoice_id:p.invoice.id,invoice_number:p.invoice.invoice_number,entry_date:input.entry_date,delta:-p.plan.credit,account_snapshot:{...p.plan,request},source_version:p.invoice.updated_date,notes:request.notes}));}
  const source=await supplierInvoice(fresh,entry.invoice_id);await supplierReturnOriginal(fresh,source);requireValue(source.status==='posted'&&JSON.stringify(moduleSnapshot('PurchaseInvoice',source))===JSON.stringify(entry.account_snapshot.invoice_snapshot),'The original invoice changed; reconcile the pending return before resuming.',409);
  const posted=await db.FinanceJournal.count({company_id:company.id,posting_key:`${company.id}:supplier-return:${entry.id}`,status:'posted'});
  if(!posted){openFinanceDate(company,entry.entry_date);requireValue(JSON.stringify(await checkedAccounts(fresh,company,entry.account_snapshot.lines,entry.entry_date))===JSON.stringify(entry.account_snapshot.lines),'Return accounts changed; reconcile before applying stock.',409);}
  await applySupplierReturnStock(db,entry);const saved=await finishSupplierJournal(fresh,entry);
  await audit(ctx.base44,ctx.user,'create','SupplierLedgerEntry','Returned purchased goods; stock, supplier credit and GL updated',{entityId:saved.id,changes:{invoice_id:saved.invoice_id,journal_id:saved.journal_id,credit:-saved.delta}});return {entry:saved};
 });
}