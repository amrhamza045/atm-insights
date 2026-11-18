import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FinanceAccountPicker from '@/components/finance/FinanceAccountPicker';
import RoutingConditionPicker from '@/components/finance/transactions/RoutingConditionPicker';
import { financeCall,financeError } from '@/components/finance/financeApi';
const KEYS={INVENTORY_CONTROL_ACCOUNT:'Inventory asset / control',INVENTORY_WIP_ACCOUNT:'Production WIP clearing',INVENTORY_COGS_ACCOUNT:'Cost of goods sold',TASTING_HOLDING_ACCOUNT:'Tastings awaiting event outcome'};
const ISSUE_TYPES={planned:'Planned stock',extra:'Extra stock',production:'Event production',tasting:'Food tasting'};
export default function InventoryBindingForm({company,binding={},onClose}) {
 const qc=useQueryClient(),[data,setData]=useState({mapping_key:'INVENTORY_CONTROL_ACCOUNT',inventory_stage:'raw',conditions:{},priority:100,effective_from:new Date().toISOString().slice(0,10),effective_to:'',account_id:'',notes:'',...binding});
 const [categories,setCategories]=useState([]);
 const patch=value=>setData(d=>({...d,...value}));
 const save=useMutation({mutationFn:async()=>{
  if(binding.id)return financeCall({action:'mapping_binding_save',company_id:company.id,id:binding.id,expected_updated_date:binding.updated_date,data});
  if(!categories.length)throw new Error('Select at least one inventory category.');
  for(const category of categories){
   await financeCall({action:'mapping_binding_save',company_id:company.id,data:{...data,conditions:{...data.conditions,category}}});
   setCategories(selected=>selected.filter(id=>id!==category));
  }
 },onSuccess:()=>onClose(),onSettled:()=>qc.invalidateQueries({queryKey:['finance']})});
 return <form className="rounded-lg border p-4 space-y-4" onSubmit={e=>{e.preventDefault();save.mutate();}}><h4 className="font-semibold">{binding.id?'Edit category account routing':'Add category account routing'}</h4>{!binding.id&&<p className="text-sm text-muted-foreground">Select multiple categories to apply the same account and routing settings. Each category is saved as a separate routing; successfully saved categories are unselected if another category cannot be saved.</p>}<fieldset disabled={save.isPending} className="grid gap-4 sm:grid-cols-2">
 <label className="text-sm">Account role<select required className="block w-full rounded-md border bg-background p-2" value={data.mapping_key} onChange={e=>patch({mapping_key:e.target.value,account_id:'',account_code:'',account_name:''})}>{Object.entries(KEYS).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
 <RoutingConditionPicker companyId={company.id} field="category" label={binding.id?'Inventory category':'Inventory categories'} currentLabel={binding.condition_labels?.category} multiple={!binding.id} value={binding.id?data.conditions.category:categories} onChange={category=>binding.id?patch({conditions:{...data.conditions,category}}):setCategories(category)} conditions={data.conditions} optionsAction="mapping_condition_options" required emptyLabel="Select category" disabled={save.isPending}/>
 {data.mapping_key==='INVENTORY_CONTROL_ACCOUNT'&&<label className="text-sm">Inventory type (one for all selected categories)<select required className="block w-full rounded-md border bg-background p-2" value={data.inventory_stage} onChange={e=>patch({inventory_stage:e.target.value})}><option value="raw">Raw materials · الخامات</option><option value="semi_finished">Semi-finished · نصف مصنع</option><option value="finished">Finished goods · المنتج النهائي</option></select></label>}
 {data.mapping_key==='INVENTORY_COGS_ACCOUNT'&&<label className="text-sm">Issue type (optional)<select className="block w-full rounded-md border bg-background p-2" value={data.conditions.issue_type||''} onChange={e=>{const {issue_type,...rest}=data.conditions;patch({conditions:e.target.value?{...rest,issue_type:e.target.value}:rest});}}><option value="">All issue types</option>{Object.entries(ISSUE_TYPES).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><span className="block text-xs text-muted-foreground mt-1">Give an issue-type routing a higher priority than the category's general COGS routing.</span></label>}
 <label className="text-sm">Chart of Accounts<FinanceAccountPicker companyId={company.id} value={data} onChange={patch} classification={data.mapping_key==='INVENTORY_COGS_ACCOUNT'?'cogs':'assets'} disabled={save.isPending}/></label>
 <label className="text-sm">Effective from<Input type="date" required value={data.effective_from} onChange={e=>patch({effective_from:e.target.value})}/></label><label className="text-sm">Priority, higher wins<Input type="number" required min="0" max="1000" value={data.priority} onChange={e=>patch({priority:Number(e.target.value)})}/></label>
 <label className="text-sm sm:col-span-2">Notes<Input maxLength={1000} value={data.notes} onChange={e=>patch({notes:e.target.value})}/></label></fieldset>
 {save.error&&<p role="alert" className="text-sm text-destructive">{financeError(save.error)}</p>}<div className="flex gap-2"><Button disabled={save.isPending||!data.account_id||(!binding.id&&!categories.length)}>{save.isPending?'Saving…':binding.id?'Save routing':`Save routing (${categories.length})`}</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button></div></form>;
}