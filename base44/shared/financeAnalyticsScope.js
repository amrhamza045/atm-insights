import { branchQuery,financeBranch } from './financeAccess.js';
import { requireValue,validDate } from './financeValidation.js';
import { getCompanyOffset,companyDay,dayWindow,TIMEZONE_MISSING } from './companyTimezone.js';
export async function analyticsScope(ctx,company,input){
 const offset=await getCompanyOffset(ctx.svc.entities);requireValue(offset!==null,TIMEZONE_MISSING);const today=companyDay(offset),to=input.to||today,from=input.from||`${to.slice(0,4)}-01-01`;
 requireValue(validDate(from)&&validDate(to)&&from<=to,'Choose valid start/end dates with the start before the end.');
 const branch=input.branch_id||(!ctx.admin&&ctx.permissions.branch_id)||'',branches=branchQuery(ctx,company);if(branch)financeBranch(ctx,company,branch);
 const branchScope=branch?{branch_id:branch}:branches;
 return {today,from,to,branch_id:branch,branchScope,ledgerScope:{company_id:company.id,...branchScope},timestamps:{$gte:new Date(dayWindow(from,offset).start).toISOString(),$lt:new Date(dayWindow(to,offset).end).toISOString()}};
}
export function reportUnits(value){const n=Number(value||0);requireValue(Number.isSafeInteger(n),'Report exceeds safe monetary precision.');return n;}