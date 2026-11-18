import { useQuery } from '@tanstack/react-query';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceAccountPicker from '@/components/finance/FinanceAccountPicker';
import FinanceListState from '@/components/finance/FinanceListState';
import { financeCall,financeError } from '@/components/finance/financeApi';
export default function FinanceAutoMappings({company,map,setMap,labels,setLabels,disabled}) {
 const query=useFinanceList({action:'read',view:'operational_accounts',company_id:company.id});
 const saved=useQuery({queryKey:['finance','auto-mapping-details',company.id,company.auto_account_map],queryFn:()=>financeCall({action:'read',view:'auto_mapping_details',company_id:company.id})});
 return <div className="space-y-3">{query.items.map(gl=><div key={gl.id} className="grid sm:grid-cols-2 gap-3 items-center"><label className="text-sm">{gl.account_number} · {gl.account_name}</label><div className={disabled?'pointer-events-none opacity-60':''}><FinanceAccountPicker companyId={company.id} disabled={disabled} value={labels[gl.id]||(map[gl.id]&&map[gl.id]===saved.data?.[gl.id]?.account_id?saved.data[gl.id]:{})} onChange={value=>{setMap({...map,[gl.id]:value.account_id});setLabels({...labels,[gl.id]:value});}}/>{map[gl.id]&&!disabled&&<button type="button" className="text-xs underline text-muted-foreground mt-1" onClick={()=>{const next={...map};delete next[gl.id];setMap(next);const names={...labels};delete names[gl.id];setLabels(names);}}>Remove mapping</button>}</div></div>)}<FinanceListState query={query}/>{saved.error&&<p role="alert" className="text-destructive text-sm">{financeError(saved.error)}</p>}</div>;
}