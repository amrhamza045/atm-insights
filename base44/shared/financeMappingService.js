import { financePermission } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
import { mappingCatalogue, MAPPING_EVENTS } from './financeMappingCatalogue.js';
import { mappingDefinition, MAPPING_BASES, MAPPING_CONDITIONS, MAPPING_DIMENSIONS } from './financeMappingValidation.js';
import { simulateMapping, mappingSample } from './financeMappingSimulation.js';
import { mappingConflicts, selectMapping } from './financeMappingTimeline.js';
import { mappingPolicyChecks } from './financeMappingPolicyChecks.js';
import { holdsSelfApprovalBypass, auditSelfApproval } from './selfApprovalBypass.js';
async function ownRule(ctx,company,id){requireValue(typeof id==='string'&&id.length<=120,'Choose a mapping version.');const rule=await ctx.svc.entities.FinanceMappingVersion.get(id);requireValue(rule.company_id===company.id,'Mapping does not belong to this company.',403);return rule;}
async function checkOverlap(ctx,company,rule){
 const page=await ctx.svc.entities.FinanceMappingVersion.filter({company_id:company.id,event_type:rule.event_type,status:'approved'},{limit:100});requireValue(!page.has_more,'More than 100 approved versions for this event; narrow and review the configuration before approval.');
 requireValue(!mappingConflicts(page.items,rule).length,'Equal-priority rule overlaps an approved mapping. Change conditions, effective dates or priority.',409);
}
export async function financeMappingRead(ctx,company,input){
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Mapping administration requires unrestricted company access.',403);
 if(input.action==='mapping_catalogue'){
  const catalog=mappingCatalogue();const a=await ctx.svc.entities.FinanceMappingVersion.aggregate({query:{company_id:company.id},groupBy:['event_type','status'],limit:500});requireValue(!a.truncated,'Mapping coverage exceeds its reporting limit.');
  return {...catalog,coverage:a.rows,bases:MAPPING_BASES,condition_fields:MAPPING_CONDITIONS,dimension_fields:MAPPING_DIMENSIONS,posting_enabled:false};
 }
 if(input.action==='mapping_versions'){
  const query={company_id:company.id};if(input.section){const ids=MAPPING_EVENTS.filter(e=>e.section===input.section).map(e=>e.id);requireValue(ids.length,'Unknown specification section.');query.event_type={$in:ids};}if(input.event_type){requireValue(MAPPING_EVENTS.some(e=>e.id===input.event_type),'Unknown financial event.');query.event_type=input.event_type;}if(input.status){requireValue(['draft','pending','approved','rejected'].includes(input.status),'Invalid version status.');query.status=input.status;}
  return await ctx.svc.entities.FinanceMappingVersion.filter(query,{sort:'-created_date',limit:25,...(input.cursor?{cursor:input.cursor}:{})});
 }
 if(input.action==='mapping_policy_checks'){
  requireValue(ctx.admin||ctx.permissions.finance_accounts_manage||ctx.permissions.finance_journal_approve,'Mapping simulation permission is required.',403);
  const rule=input.id?await ownRule(ctx,company,input.id):input.definition;
  return await mappingPolicyChecks(ctx,company,rule,input.id?rule.fixture:input.sample);
 }
 if(input.action==='mapping_simulate'){
  const rule=input.id?await ownRule(ctx,company,input.id):input.definition;requireValue(ctx.admin||ctx.permissions.finance_accounts_manage||ctx.permissions.finance_journal_approve,'Mapping simulation permission is required.',403);return await simulateMapping(ctx,company,rule,input.sample);
 }
 if(input.action==='mapping_resolve'){
  requireValue(ctx.admin||ctx.permissions.finance_accounts_manage||ctx.permissions.finance_journal_approve,'Mapping simulation permission is required.',403);requireValue(MAPPING_EVENTS.some(e=>e.id===input.event_type),'Unknown financial event.');
  const sample=mappingSample(company,input.sample);
  const page=await ctx.svc.entities.FinanceMappingVersion.filter({company_id:company.id,event_type:input.event_type,status:'approved'},{sort:'-version',limit:100});requireValue(!page.has_more,'Too many versions to safely resolve.');
  const matched=selectMapping(page.items,sample);
  return {...await simulateMapping(ctx,company,matched,sample),mapping_id:matched.id,version:matched.version,match_reason:'Highest matching priority within dated revision intervals; historical versions remain available for their original dates.'};
 }
 requireValue(false,'Unknown mapping read action.');
}
export async function financeMappingWrite(ctx,company,input){
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Mapping administration requires unrestricted company access.',403);
 const entity=ctx.svc.entities.FinanceMappingVersion;
 if(input.action==='mapping_save'){
  financePermission(ctx,'finance_accounts_manage');const definition=mappingDefinition(company,input.data||{}),preview=await simulateMapping(ctx,company,definition,input.sample);
  const clean={...definition,fixture:preview.sample,lines:preview.lines.map(({side,basis,account_id,account_key,role,negative_behavior,account_code,account_name})=>({side,basis,account_id:account_key?'':account_id,account_key:account_key||'',role,negative_behavior,account_code:account_key?'':account_code,account_name:account_key?'':account_name}))};
  if(input.id){const r=await ownRule(ctx,company,input.id);requireValue(r.status==='draft'&&(ctx.admin||r.prepared_by_id===ctx.user.id),'Only the maker or an administrator can edit this draft.',403);requireValue(r.updated_date===input.expected_updated_date,'Draft changed; reload before saving.',409);requireValue(r.event_type===definition.event_type,'A rule cannot change financial event.');return {rule:await entity.update(r.id,{...clean,prepared_by_id:ctx.user.id,prepared_by:ctx.user.email})};}
  requireValue(/^[0-9a-f-]{36}$/i.test(input.request_id||''),'A unique draft request ID is required.');const key=`${company.id}:${input.request_id}`;
  const prior=await entity.filter({company_id:company.id,rule_key:key},{limit:1});if(prior.items.length){requireValue(prior.items[0].prepared_by_id===ctx.user.id,'Draft request belongs to another maker.',403);return {rule:prior.items[0],replayed:true};}
  return {rule:await entity.create({...clean,company_id:company.id,rule_key:key,version:1,status:'draft',prepared_by_id:ctx.user.id,prepared_by:ctx.user.email})};
 }
 const r=await ownRule(ctx,company,input.id);requireValue(r.updated_date===input.expected_updated_date,'Mapping changed; reload before this action.',409);
 if(input.action==='mapping_delete'){
  financePermission(ctx,'finance_accounts_manage');requireValue(r.status==='draft'&&(ctx.admin||r.prepared_by_id===ctx.user.id),'Only unused drafts may be deleted by their maker or an administrator.',403);
  await ctx.base44.asServiceRole.entities.FinanceAuditEvent.create({company_id:company.id,actor_id:ctx.user.id,actor_email:ctx.user.email,actor_type:'user',operation:input.action,action:'delete',entity_type:'FinanceMappingVersion',entity_id:r.id,entity_label:r.name,before:r,after:{},changed_fields:['deleted'],request_id:ctx.auditRequestId});
  await entity.delete(r.id);return {deleted:true};
 }
 if(input.action==='mapping_copy'){
  financePermission(ctx,'finance_accounts_manage');requireValue(['approved','rejected'].includes(r.status),'Create a revision from an approved or rejected version.');
  const page=await entity.filter({company_id:company.id,rule_key:r.rule_key},{sort:'-version',limit:1});requireValue(!['draft','pending'].includes(page.items[0].status),'Finish the existing draft or pending revision first.',409);
  const definition=mappingDefinition(company,{...r,effective_from:company.closed_through&&r.effective_from<=company.closed_through?new Date(Date.parse(company.closed_through)+86400000).toISOString().slice(0,10):r.effective_from,effective_to:''});return {rule:await entity.create({...definition,lines:r.lines,fixture:r.fixture,company_id:company.id,rule_key:r.rule_key,version:page.items[0].version+1,status:'draft',prepared_by_id:ctx.user.id,prepared_by:ctx.user.email,supersedes_id:r.id})};
 }
 if(input.action==='mapping_submit'){
  financePermission(ctx,'finance_accounts_manage');requireValue(r.status==='draft'&&r.prepared_by_id===ctx.user.id,'Only the maker can submit their draft.',403);mappingDefinition(company,r);await simulateMapping(ctx,company,r,r.fixture);await checkOverlap(ctx,company,r);return {rule:await entity.update(r.id,{status:'pending'})};
 }
 requireValue(input.action==='mapping_decide','Unknown mapping change.');financePermission(ctx,'finance_journal_approve');requireValue(r.status==='pending','This version is not awaiting review.',409);const selfReview=r.prepared_by_id===ctx.user.id;requireValue(!selfReview||await holdsSelfApprovalBypass(ctx.svc,ctx.user),'A different authorized person must review. To approve your own version, your role needs Self-approve (skip second approver).',403);
 requireValue(['approved','rejected'].includes(input.decision),'Choose approve or reject.');requireValue(typeof input.note==='string'&&input.note.trim()&&input.note.length<=1000,'A review reason is required.');
 if(input.decision==='approved'){
  mappingDefinition(company,r);await simulateMapping(ctx,company,r,r.fixture);await checkOverlap(ctx,company,r);
  const older=await entity.filter({company_id:company.id,rule_key:r.rule_key,status:'approved'},{sort:'-version',limit:1});requireValue(!older.items.length||r.effective_from>older.items[0].effective_from,'A revision must start after the earlier approved version; past mappings remain unchanged.');
 }
 const rule=await entity.update(r.id,{status:input.decision,reviewed_by_id:ctx.user.id,reviewed_by:ctx.user.email,reviewed_at:new Date().toISOString(),review_note:input.note.trim()});
 if(selfReview&&input.decision==='approved')await auditSelfApproval(ctx.svc,ctx.user,'FinanceMappingVersion',r.id,`mapping configuration ${r.rule_key} version ${r.version}`);
 return {rule};
}