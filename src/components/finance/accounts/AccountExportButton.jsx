import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function AccountExportButton({company}){
 const download=useMutation({mutationFn:async()=>{
  const data=await financeCall({action:'account_export',company_id:company.id});
  const XLSX=await import('xlsx'),book=XLSX.utils.book_new();
  const headers=['code','name','name_ar','parent_code','classification','normal_balance','posting','active','management_mapping','statutory_mapping','effective_from','effective_to','report_cash_equivalent','report_cash_flow_section'];
  const sheet=XLSX.utils.json_to_sheet(data.rows,{header:headers});sheet['!cols']=headers.map(h=>({wch:h.includes('name')?36:24}));
  XLSX.utils.book_append_sheet(book,sheet,'Chart of Accounts');
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Company',data.company_name],['Exported at (UTC)',data.exported_at],['Contents','All existing account definitions, including inactive accounts and groups. No balances, journals or account IDs.'],['Restore','Import the Chart of Accounts sheet in the same company; choose Update matching codes to restore definitions while preserving IDs. Preview and review before saving.']]),'Backup information');
  const filename=company.name.replace(/[^a-zA-Z0-9\u0600-\u06ff_-]+/g,'_')||'Company';XLSX.writeFile(book,`${filename}_Chart_of_Accounts_${data.exported_at.slice(0,10)}.xlsx`);return data.rows.length;
 }});
 return <div><Button variant="outline" disabled={download.isPending} onClick={()=>download.mutate()}>{download.isPending?'Exporting all accounts…':'Export Excel backup'}</Button>{download.error&&<p role="alert" className="text-sm text-destructive">{financeError(download.error)}</p>}{download.isSuccess&&<p role="status" className="text-xs text-muted-foreground">{download.data} account definitions exported, including all statuses and groups.</p>}</div>;
}