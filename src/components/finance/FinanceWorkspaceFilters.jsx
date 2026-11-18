import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FinanceListState from '@/components/finance/FinanceListState';
export default function FinanceWorkspaceFilters({branches,filters,onChange}){
 const set=(key,value)=>onChange({...filters,[key]:value});
 return <div className="space-y-2"><div className="flex flex-wrap items-end gap-3"><Label>From<Input type="date" value={filters.from} onChange={e=>set('from',e.target.value)}/></Label><Label>To<Input type="date" value={filters.to} onChange={e=>set('to',e.target.value)}/></Label><Label>Branch<select aria-label="Finance branch" className="block border rounded-md p-2 bg-background" value={filters.branch_id} onChange={e=>set('branch_id',e.target.value)}><option value="">All authorized company branches</option>{branches.items.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></Label><Button variant="ghost" onClick={()=>onChange({from:'',to:'',branch_id:''})}>Clear filters</Button></div><FinanceListState query={branches}/></div>;
}