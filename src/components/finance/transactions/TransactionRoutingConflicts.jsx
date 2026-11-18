export default function TransactionRoutingConflicts({plan}){
 return <div className="space-y-2 rounded-md border p-3 text-sm">
  {plan.overlaps.length>0?<><p className="font-medium">Existing overlapping routing</p>{plan.overlaps.map(b=><p key={b.id}>{b.account_code} · {b.account_name} · Priority {b.priority} · From {b.effective_from}{b.effective_to?` to ${b.effective_to}`:''} · {Object.entries(b.conditions||{}).map(([key,value])=>`${key.replaceAll('_',' ')}: ${value}`).join(' · ')||'All supported conditions'}</p>)}<p className="text-muted-foreground">Existing routing will be reused when it covers this branch, account and effective dates. Transaction Audit will not create a higher-priority duplicate; changing existing routing must be reviewed in Mapping Accounts.</p></>:<p>No existing routing overlaps these conditions and dates.</p>}

 </div>;
}