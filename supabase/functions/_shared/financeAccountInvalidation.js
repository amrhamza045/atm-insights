export async function invalidateAccountReports(ctx,company,previous,next){
 if(!previous||((previous.report_cash_equivalent||'auto')===(next.report_cash_equivalent||'auto')&&(previous.report_cash_flow_section||'auto')===(next.report_cash_flow_section||'auto')))return;
 let result;do{result=await ctx.svc.entities.FinanceJournal.updateMany({company_id:company.id,status:'posted',ledger_ready:true,'lines.account_id':previous.id},{$set:{ledger_ready:false}});}while(result.has_more);
}