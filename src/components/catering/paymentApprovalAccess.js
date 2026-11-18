export function canReviewCateringPayment(permissions,isAdmin,branchId){
 return isAdmin||(!permissions?.access_denied&&!permissions?.disabled_modules?.includes('catering')&&(permissions?.catering_finance===true||permissions?.catering_payment_approve===true)&&(!permissions?.branch_id||!branchId||permissions.branch_id===branchId));
}
// Deciding your own request: only while auto-approval is on (or you hold Self-approve) and you hold that request type's approval permission.
export function canSelfApprove(permissions,isAdmin,autoApprove,key='catering_payment_approve'){
 return autoApprove&&(isAdmin||(!permissions?.access_denied&&permissions?.[key]===true));
}