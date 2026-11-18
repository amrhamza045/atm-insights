import { accountRecords } from './financeAccountModel.js';
export async function financeAccountReferences(ctx,company,accounts){
 const ids=accounts.map(a=>a.id),codes=accounts.map(a=>a.code),refs=new Map(ids.map(id=>[id,new Set()]));if(!ids.length)return refs;
 const add=(id,reason)=>{if(refs.has(id))refs.get(id).add(reason);};
 for(const id of Object.values(company.auto_account_map||{}))add(id,'automatic mapping');for(const id of Object.values(company.module_policy?.map||{}))add(id,'module mapping');
 const scope={company_id:company.id},lineQuery={...scope,$or:[{'lines.account_id':{$in:ids}},{'lines.account_code':{$in:codes}}]};
 const [journals,proposals,rules,taxes,ledger]=await Promise.all([
  accountRecords(ctx.svc.entities.FinanceJournal,lineQuery),accountRecords(ctx.svc.entities.FinanceProposal,lineQuery),accountRecords(ctx.svc.entities.FinanceMappingVersion,lineQuery),accountRecords(ctx.svc.entities.FinanceTaxConfig,{...scope,$or:[{output_account_id:{$in:ids}},{input_account_id:{$in:ids}}]}),ctx.svc.entities.FinanceLedgerLine.aggregate({query:{...scope,account_code:{$in:codes}},groupBy:'account_code',limit:1000})
 ]);
 const bindings=await accountRecords(ctx.svc.entities.FinanceAccountBinding,{...scope,account_id:{$in:ids}});
 for(const binding of bindings)add(binding.account_id,'dynamic account binding');
 const methods=await accountRecords(ctx.svc.entities.FinancePaymentMethod,{...scope,account_id:{$in:ids}});
 for(const method of methods)add(method.account_id,'payment method mapping');
 const payments=await accountRecords(ctx.svc.entities.CateringPayment,{'payment_account_snapshot.company_id':company.id,'payment_account_snapshot.accounts.account_id':{$in:ids}});
 for(const payment of payments)for(const account of payment.payment_account_snapshot.accounts)add(account.account_id,'payment routing history');
 const byCode=new Map(accounts.map(a=>[a.code,a.id]));
 for(const [rows,reason] of [[journals,'journal history'],[proposals,'journal proposal'],[rules,'mapping rule']])for(const row of rows)for(const line of row.lines||[]){add(line.account_id,reason);add(byCode.get(line.account_code),reason);}
 for(const t of taxes){add(t.output_account_id,'VAT mapping');add(t.input_account_id,'VAT mapping');}
 if(ledger.truncated)throw Object.assign(new Error('Too many ledger groups to safely review these accounts.'),{status:400});for(const row of ledger.rows)add(byCode.get(row.account_code),'ledger history');
 return new Map([...refs].map(([id,reasons])=>[id,[...reasons]]));
}