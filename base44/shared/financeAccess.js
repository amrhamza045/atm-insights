import { getEffectivePermissions } from './resolveEffectivePermissions.js';
import { requireValue } from './financeValidation.js';
import { financeAuditClient } from './financeAuditClient.js';
export async function financeContext(base44) {
 const user=await base44.auth.me(); requireValue(user,'Sign in to access Finance.',401);
 const permissions=await getEffectivePermissions(base44,user), admin=user.role==='admin';
 requireValue(admin||(!permissions.access_denied&&permissions.financial_view),'Financial viewing permission is required.',403);
 const ctx={base44,svc:base44.asServiceRole,user,permissions,admin,auditRequestId:crypto.randomUUID()};
 ctx.svc=financeAuditClient(ctx);
 return ctx;
}
export function financePermission(ctx,key) { requireValue(ctx.admin||ctx.permissions[key]===true,`Permission required: ${key}`,403); }
export async function financeCompany(ctx,id) {
 requireValue(typeof id==='string'&&id,'Select a company.');
 const company=await ctx.svc.entities.FinanceCompany.get(id);
 requireValue(company,'Company not found.',404);
 requireValue(ctx.admin||company.member_emails?.includes(ctx.user.email.toLowerCase()),'No access to this company.',403);
 return company;
}
export function financeBranch(ctx,company,id) {
 requireValue(company.branch_ids.includes(id),'The branch must belong to this company.');
 requireValue(ctx.admin||!ctx.permissions.branch_id||ctx.permissions.branch_id===id,'No access to this branch.',403);
}
export function branchQuery(ctx,company) {
 const ids=ctx.admin||!ctx.permissions.branch_id?company.branch_ids:company.branch_ids.filter(id=>id===ctx.permissions.branch_id);
 return {branch_id:{$in:ids}};
}
// Conditional update of one company record serializes writes and closing. No lease
// expiry: an interrupted worker fails closed rather than allowing overlapping writes.
export async function withFinanceLock(ctx,company,work) {
 const token=crypto.randomUUID(), entity=ctx.svc.entities.FinanceCompany;
 await entity.updateMany({id:company.id,write_token:''},{$set:{write_token:token,write_started_at:new Date().toISOString()}});
 const fresh=await entity.get(company.id);
 requireValue(fresh.write_token===token,'Another finance change is in progress. Retry shortly; an interrupted lock must be reviewed by an administrator.',409);
 try { return await work(fresh); }
 finally { await entity.updateMany({id:company.id,write_token:token},{$set:{write_token:'',write_started_at:''}}); }
}