import { Button } from '@/components/ui/button';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
export default function BlueprintSavedRules({company,section,onOpen}){
 const query=useFinanceList({action:'mapping_versions',company_id:company.id,section});
 return <section className="space-y-3"><h4 className="font-semibold">Saved rules & revisions</h4>{query.items.map(rule=><article key={rule.id} className="border rounded-lg p-3 flex flex-wrap justify-between gap-3"><div><h5 className="text-sm font-semibold">{rule.name}</h5><p className="text-xs text-muted-foreground">{rule.status} · Version {rule.version} · Priority {rule.priority} · {rule.effective_from} → {rule.effective_to||'No end date'}</p></div><Button variant="outline" size="sm" onClick={()=>onOpen(rule)}>Open rule</Button></article>)}<FinanceListState query={query}/></section>;
}