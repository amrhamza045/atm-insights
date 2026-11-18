import { getEffectivePermissions } from './resolveEffectivePermissions.js';
import { isCentralAdmin } from './platformRole.js';
import { selfApprovalReason } from './autoApproval.js';
export const paymentReviewError=(message,status=400)=>Object.assign(new Error(message),{status});
// Submitters decide their own payment only when self-approval applies to them (Catering Payment Approval + the switch or Self-approve).
// Returns why it applied ('switch' | 'bypass'), or null when the payment isn't theirs.
export async function guardOwnPayment(ctx,payment,message){
 const own=payment.recorded_by_id===ctx.user.id||String(payment.recorded_by||'').toLowerCase()===ctx.user.email.toLowerCase();
 if(!own)return null;
 const reason=await selfApprovalReason(ctx.svc,ctx.central,ctx.permissions,'catering_payment_approve',ctx.user);
 if(!reason)throw paymentReviewError(message,403);
 return reason;
}
export async function paymentReviewContext(base44){
 const user=await base44.auth.me();if(!user)throw paymentReviewError('Sign in to review catering payments.',401);
 const permissions=await getEffectivePermissions(base44,user),central=isCentralAdmin(user,permissions);
 if(!central&&(permissions.access_denied||permissions.disabled_modules?.includes('catering')||!(permissions.catering_finance||permissions.catering_payment_approve)))throw paymentReviewError('Catering finance or payment approval permission is required.',403);
 return {user,permissions,central,svc:base44.asServiceRole};
}
export function paymentReviewBranch(ctx,event){
 if(!ctx.central&&ctx.permissions.branch_id&&ctx.permissions.branch_id!==event.branch_id)throw paymentReviewError('This event belongs to another branch.',403);
}
export async function pendingCateringPayments(base44,input){
 const ctx=await paymentReviewContext(base44),query={status:'pending',payment_type:{$ne:'deposit_withdrawal'}};
 if(!ctx.central&&ctx.permissions.branch_id)query.branch_id=ctx.permissions.branch_id;
 if(input.event_id){const event=await ctx.svc.entities.CateringEvent.get(input.event_id);paymentReviewBranch(ctx,event);query.event_id=event.id;}
 if(input.branch_id){paymentReviewBranch(ctx,{branch_id:input.branch_id});query.branch_id=input.branch_id;}
 const [page,total]=await Promise.all([ctx.svc.entities.CateringPayment.filter(query,{sort:'-created_date',limit:25,...(input.cursor?{cursor:input.cursor}:{})}),ctx.svc.entities.CateringPayment.count(query)]);
 return {...page,total};
}