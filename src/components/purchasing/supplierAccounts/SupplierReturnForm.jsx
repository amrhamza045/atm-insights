import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { companyToday } from '@/components/utils/timezoneHelper';
import { supplierAccountCall, supplierError, refreshSupplierAccounts } from '@/components/purchasing/supplierAccounts/supplierAccountApi';
import SupplierReturnFields from '@/components/purchasing/supplierAccounts/SupplierReturnFields';
import SupplierReturnPreview from '@/components/purchasing/supplierAccounts/SupplierReturnPreview';
export default function SupplierReturnForm({scope, invoice, resume, onClose}) {
 const client=useQueryClient(),[value,setValue]=useState({entry_date:companyToday(),notes:'',quantities:{}}),[preview,setPreview]=useState(resume?{plan:resume.account_snapshot}:null),[confirmed,setConfirmed]=useState(false);
 const [requestKey]=useState(()=>resume?.entry_key.replace(/^supplier-return:/,'')||crypto.randomUUID());
 const details=useQuery({queryKey:['supplier-accounts',scope,'return-details',invoice?.id],enabled:!resume,queryFn:()=>supplierAccountCall({...scope,action:'return_details',invoice_id:invoice.id})});
 const request=resume?.account_snapshot.request||{invoice_id:invoice?.id,entry_date:value.entry_date,notes:value.notes,items:Object.entries(value.quantities).filter(([,q])=>Number(q)>0).map(([index,q])=>({line_index:Number(index),quantity:Number(q)}))};
 const review=useMutation({mutationFn:()=>supplierAccountCall({...scope,...request,action:'return_preview'}),onSuccess:data=>{setPreview(data);setConfirmed(false);}});
 const save=useMutation({mutationFn:()=>supplierAccountCall({...scope,...request,action:'return_supplier',request_key:requestKey,preview_token:preview?.token,confirmed}),onSuccess:()=>{refreshSupplierAccounts(client);client.invalidateQueries({queryKey:['inventoryItems']});onClose();},onError:()=>refreshSupplierAccounts(client)});
 const busy=review.isPending||save.isPending;
 const change=next=>{setValue(next);setPreview(null);setConfirmed(false);review.reset();save.reset();};
 return <section className="rounded-lg border bg-card p-4 space-y-4"><h4 className="font-semibold">{resume?'Resume saved supplier return':`Return goods · ${invoice.invoice_number}`}</h4>
  <p className="text-sm text-muted-foreground">Uses the original purchase invoice credit and verified branch-stock valuation; the original invoice and historical journals remain unchanged.</p>
  {!resume&&details.isPending&&<p role="status">Loading original invoice…</p>}
  {details.error&&<p role="alert" className="text-destructive">{supplierError(details.error)} <Button variant="link" onClick={()=>details.refetch()}>Retry</Button></p>}
  {!resume&&details.data&&<SupplierReturnFields items={details.data.items} value={value} onChange={change} disabled={busy}/>}
  {preview&&<SupplierReturnPreview plan={preview.plan}/>}
  {preview&&<label className="flex items-start gap-2 text-sm"><Checkbox checked={confirmed} onCheckedChange={checked=>setConfirmed(checked===true)} disabled={busy}/><span>I confirm the goods were returned and the supplier credit-note amount is correct.</span></label>}
  {(review.error||save.error)&&<p role="alert" className="text-sm text-destructive">{supplierError(save.error||review.error)}</p>}
  <div className="flex flex-wrap gap-2">{!resume&&<Button type="button" variant="outline" disabled={busy||!details.data||!request.items.length||!request.entry_date||request.notes.trim().length<5} onClick={()=>review.mutate()}>{review.isPending?'Preparing preview…':'Preview return'}</Button>}
   {preview&&<Button type="button" disabled={busy||!confirmed} onClick={()=>save.mutate()}>{save.isPending?'Recording return…':resume?'Resume saved return':'Confirm supplier return'}</Button>}
   <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button></div>
 </section>;
}