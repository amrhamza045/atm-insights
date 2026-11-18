import { branchQuery, financePermission } from './financeAccess.js';
import { requireValue, validDate } from './financeValidation.js';
export async function readFinanceWorkspace(ctx,company,input) {
 const scope={company_id:company.id,...branchQuery(ctx,company)},opts={limit:50,sort:'-created_date',...(input.cursor?{cursor:input.cursor}:{})};
 const dates={}; if(input.from){requireValue(validDate(input.from),'Invalid start date.');dates.$gte=input.from;} if(input.to){requireValue(validDate(input.to),'Invalid end date.');dates.$lte=input.to;}
 if(Object.keys(dates).length) scope.entry_date=dates;
 if(input.branch_id){requireValue(company.branch_ids.includes(input.branch_id)&&(ctx.admin||!ctx.permissions.branch_id||input.branch_id===ctx.permissions.branch_id),'Branch not authorized.',403);scope.branch_id=input.branch_id;}
 if(input.view==='accounts') {
  const query={company_id:company.id};
  if(input.search){const text=String(input.search).slice(0,80).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');query.$or=[{code:{$regex:text,$options:'i'}},{name:{$regex:text,$options:'i'}},{name_ar:{$regex:text,$options:'i'}}];}
  if(input.posting_only){query.posting=true;query.active=true;}
  if(input.classification){requireValue(['assets','liabilities','equity','revenue','cogs','operating_expenses','other_result','income_tax'].includes(input.classification),'Invalid account classification.');query.classification=input.classification;}
  if(input.parent_only)query.posting=false;
  if(input.account_status){requireValue(['active','inactive'].includes(input.account_status),'Invalid account status.');query.active=input.account_status==='active';}
  if(input.account_kind){requireValue(['posting','group'].includes(input.account_kind),'Invalid account kind.');query.posting=input.account_kind==='posting';}
  return await ctx.svc.entities.FinanceAccount.filter(query,{...opts,sort:'code'});
 }
 if(input.view==='operational_accounts')return await ctx.svc.entities.GLAccount.filter({},{...opts,sort:'account_number'});
  if(input.view==='auto_mapping_details') {
   const map=company.auto_account_map||{},ids=[...new Set(Object.values(map))];
   if(!ids.length)return {};
   const accounts=await ctx.svc.entities.FinanceAccount.filter({company_id:company.id,id:{$in:ids}},{limit:100});
   return Object.fromEntries(Object.entries(map).map(([gl,id])=>{const a=accounts.items.find(a=>a.id===id);return [gl,a?{account_id:a.id,account_code:a.code,account_name:a.name}:{}];}));
  }
  if(input.view==='posting_issues')return await ctx.svc.entities.FinancePostingIssue.filter({...scope,status:'open'},opts);
  if(input.view==='proposals') return await ctx.svc.entities.FinanceProposal.filter({...scope,status:'pending'},opts);
 if(input.view==='journals') return await ctx.svc.entities.FinanceJournal.filter(scope,{...opts,sort:'-entry_date'});
 if(input.view==='legacy') {
  financePermission(ctx,'finance_reconstruct');
  const query={...branchQuery(ctx,company),posted:true};
  if(input.branch_id) query.branch_id=scope.branch_id;
  if(input.from||input.to) query.entry_date={...(input.from?{$gte:input.from}:{}),...(input.to?{$lt:new Date(Date.parse(input.to)+86400000).toISOString().slice(0,10)}:{})};
  const page=await ctx.svc.entities.JournalEntry.filter(query,{...opts,sort:'-entry_date'});
  const ids=page.items.map(j=>j.id);
  const done=ids.length?await ctx.svc.entities.FinanceJournal.filter({company_id:company.id,...branchQuery(ctx,company),source_entity:'JournalEntry',source_id:{$in:ids},status:'posted'},{limit:50,fields:['source_id']}):{items:[]};
  return {...page,items:page.items.map(j=>({...j,reconstructed:done.items.some(d=>d.source_id===j.id)}))};
 }
 if(input.view==='summary') {
  const [totals,pending,legacy]=await Promise.all([ctx.svc.entities.FinanceJournal.aggregate({query:scope,groupBy:'status',sum:['total_debit','total_credit']}),ctx.svc.entities.FinanceProposal.count({...scope,status:'pending'}),ctx.svc.entities.JournalEntry.count({...branchQuery(ctx,company),posted:true})]);
  return {totals:totals.rows,pending,legacy,refreshed_at:new Date().toISOString(),reconciliation_status:'Posted company-ledger movements include reviewed and automatic entries. Statements are available separately; historical reconstruction and missing source integrations still require reconciliation.'};
 }
 throw Object.assign(new Error('Unknown finance view.'),{status:400});
}