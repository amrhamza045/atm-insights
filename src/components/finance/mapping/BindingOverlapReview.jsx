import useDebouncedValue from '@/hooks/useDebouncedValue';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
import auditRoutingPriority from '@/components/finance/transactions/auditRoutingPriority';
export default function BindingOverlapReview({companyId,data,bindingId}){
 const key=useDebouncedValue(data.mapping_key),valid=/^(?:Cancellation_Customer|[A-Z][A-Z0-9_]{1,79})$/.test(key||'');
 const query=useFinanceList({action:'mapping_bindings',company_id:companyId,mapping_key:key},valid);
 if(!valid||key!==data.mapping_key)return <p className="text-xs text-muted-foreground">Choose a mapping key to review existing routing.</p>;
 const {overlaps}=auditRoutingPriority(query.items.filter(b=>b.id!==bindingId),key,data.effective_from,data.conditions,data.effective_to);
 return <section className="border rounded-lg p-3 space-y-2 text-sm" aria-label="Account routing overlap review"><h5 className="font-semibold">Review existing overlapping routing</h5>
 <p>{data.account_code?`${data.account_code} · ${data.account_name}`:'Select a destination account'} · {data.effective_from||'Choose start date'} to {data.effective_to||'no end date'} · Priority {data.priority}</p>
 {overlaps.map(b=><div key={b.id} className="rounded border p-2"><p>{b.account_code} · {b.account_name} · Priority {b.priority}{Number(data.priority)===b.priority?' · Equal-priority conflict':''}</p><p>{b.effective_from} to {b.effective_to||'no end date'}</p><p className="break-words text-xs text-muted-foreground">{Object.entries(b.conditions||{}).map(([k,v])=>`${k.replaceAll('_',' ')}: ${v}`).join(' · ')||'Any supported document context'}</p></div>)}
 {query.isSuccess&&!overlaps.length&&!query.hasNextPage&&<p>No existing routing overlaps these conditions and dates.</p>}
 {query.hasNextPage&&<p className="text-muted-foreground">Review is partial. Load more to check the remaining routing.</p>}
 {(query.isPending||query.error||query.hasNextPage)&&<FinanceListState query={query}/>}
 <p className="text-xs text-muted-foreground">Higher matching priority wins; equal-priority overlaps are rejected on save. Saving checks the latest configuration and does not rewrite posted journals or enable unsupported source adapters.</p></section>;
}