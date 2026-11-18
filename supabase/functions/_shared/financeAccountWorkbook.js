import * as XLSX from 'npm:xlsx@0.18.5';
import { financePermission } from './financeAccess.js';
import { requireValue } from './financeValidation.js';
const WORKBOOK_URI='mp/private/6a8b0b3fb73ae7d930386c1d/4b3e78a69_RoseMary_ERP_Chart_of_Accounts_corrected.xlsx';
export async function financeAccountWorkbook(ctx){
 financePermission(ctx,'finance_accounts_manage');
 const {signed_url}=await ctx.svc.integrations.Core.CreateFileSignedUrl({file_uri:WORKBOOK_URI,expires_in:120});const response=await fetch(signed_url,{signal:AbortSignal.timeout(15000)});requireValue(response.ok,'The attached workbook could not be loaded.');
 const workbook=XLSX.read(await response.arrayBuffer(),{type:'array'});const sheet=workbook.Sheets['Chart of Accounts'];requireValue(sheet,'The workbook is missing its Chart of Accounts sheet.');
 return {name:'RoseMary ERP Chart of Accounts',rows:XLSX.utils.sheet_to_json(sheet),notice:'Abnormal Kitchen Waste has been renumbered to 50404. Inventory Count Differences remains 50403. Only the Chart of Accounts sheet is imported; approval limits are not changed.'};
}