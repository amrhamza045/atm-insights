import { financeCompany,financePermission,withFinanceLock } from './financeAccess.js';
import { requireValue } from './financeValidation.js';

export async function comparisonCompanies(ctx,anchor,input){
 const query={currency:anchor.currency,is_test:!!anchor.is_test,...(ctx.admin?{}:{member_emails:ctx.user.email.toLowerCase()}),...(!ctx.admin&&ctx.permissions.branch_id?{branch_ids:ctx.permissions.branch_id}:{})};
 const page=await ctx.svc.entities.FinanceCompany.filter(query,{sort:'name',limit:50,...(input.cursor?{cursor:input.cursor}:{})});
 return {...page,items:page.items.map(c=>({id:c.id,name:c.name,currency:c.currency,parent_company_id:c.parent_company_id||'',full_scope:ctx.admin||!ctx.permissions.branch_id}))};
}
async function ancestors(ctx,company,parentId){
 const chain=[],seen=new Set([company.id]);
 while(parentId){
  requireValue(!seen.has(parentId),'A company cannot be its own ancestor.');
  requireValue(chain.length<30,'Company hierarchy exceeds 30 levels.');seen.add(parentId);
  const parent=await financeCompany(ctx,parentId);
  requireValue(parent.currency===company.currency&&!!parent.is_test===!!company.is_test,'Parent and subsidiary must use the same currency and environment.');
  chain.push(parent);parentId=parent.parent_company_id;
 }
 return chain;
}
export async function saveFinanceParent(ctx,company,input){
 financePermission(ctx,'finance_company_manage');
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Company relationships require unrestricted branch access.',403);
 requireValue(typeof input.parent_company_id==='string','Select a parent company or No parent.');
 const chain=await ancestors(ctx,company,input.parent_company_id),locked=[company,...chain].sort((a,b)=>a.id.localeCompare(b.id));
 // Lock the child and every proposed ancestor in deterministic order. Recheck
 // inside the locks so concurrent relationship edits cannot create cycles.
 const run=async index=>index===locked.length?commit():withFinanceLock(ctx,locked[index],()=>run(index+1));
 const commit=async()=>{
  const current=await ancestors(ctx,company,input.parent_company_id);
  requireValue(current.every(c=>locked.some(l=>l.id===c.id)),'The hierarchy changed during editing. Refresh and retry.',409);
  await ctx.svc.entities.FinanceCompany.update(company.id,{parent_company_id:input.parent_company_id});
  return {previous_parent_company_id:company.parent_company_id||'',parent_company_id:input.parent_company_id};
 };
 return await run(0);
}
export async function financeGroupCompanies(ctx,root){
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Full group reports require unrestricted branch access.',403);
 const members=[root],seen=new Set([root.id]);let frontier=[root.id];
 while(frontier.length){
  const page=await ctx.svc.entities.FinanceCompany.filter({parent_company_id:{$in:frontier}},{limit:50});
  requireValue(!page.has_more,'This group is too large. Compare individual companies instead.');frontier=[];
  for(const c of page.items){
   requireValue(!seen.has(c.id),'The company hierarchy contains a cycle. Correct relationships first.');
   requireValue(ctx.admin||c.member_emails?.includes(ctx.user.email.toLowerCase()),'Full group reporting requires access to every subsidiary.',403);
   requireValue(c.currency===root.currency&&!!c.is_test===!!root.is_test,'Every group member must use the same currency and environment.');
   seen.add(c.id);members.push(c);frontier.push(c.id);
   requireValue(members.length<=6,'Compare groups with up to six legal companies; choose individual entities for larger groups.');
  }
 }
 return members;
}