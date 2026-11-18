import { financePermission,financeBranch,branchQuery } from './financeAccess.js';
import { requireValue,validDate } from './financeValidation.js';
const types=['FinanceCompany','FinanceAccount','FinanceProposal','FinanceJournal','FinanceBudget','FinanceTaxRule','FinanceTaxAssessment','FinanceTaxConfig','FinanceTaxDocument','FinanceVarianceAlertConfig','CateringPayment'];
export async function readFinanceAudit(ctx,company,input){
 financePermission(ctx,'finance_audit_view');
 requireValue(ctx.admin||!ctx.permissions.disabled_modules?.includes('financial'),'Finance access is disabled.',403);
 const query={company_id:company.id};
 if(input.branch_id){financeBranch(ctx,company,input.branch_id);query.branch_id=input.branch_id;}
 else if(!ctx.admin&&ctx.permissions.branch_id)Object.assign(query,branchQuery(ctx,company));
 if(input.from||input.to){
  requireValue(!input.from||validDate(input.from),'Choose a valid audit start date.');requireValue(!input.to||validDate(input.to),'Choose a valid audit end date.');
  requireValue(!input.from||!input.to||input.from<=input.to,'Audit start date must not follow end date.');
  query.created_date={...(input.from?{$gte:`${input.from}T00:00:00.000Z`}:{}),...(input.to?{$lt:new Date(Date.parse(input.to)+86400000).toISOString()}: {})};
 }
 if(input.action_filter){requireValue(['create','update','approve','reject','reversal'].includes(input.action_filter),'Invalid audit action.');query.action=input.action_filter;}
 if(input.entity_type){requireValue(types.includes(input.entity_type),'Invalid financial record type.');query.entity_type=input.entity_type;}
 if(input.actor){requireValue(typeof input.actor==='string'&&input.actor.length<=200,'Actor search is too long.');const text=input.actor.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');query.$or=[{actor_email:{$regex:text,$options:'i'}},{actor_name:{$regex:text,$options:'i'}},{actor_id:input.actor}];}
 return await ctx.svc.entities.FinanceAuditEvent.filter(query,{sort:'-created_date',limit:25,...(input.cursor?{cursor:input.cursor}:{})});
}