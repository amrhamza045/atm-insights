import routingSourceMatch from '@/components/finance/transactions/routingSourceMatch';
const labels={payment_method:'Payment method',branch_id:'Branch',currency:'Currency',payment_type:'Payment type',customer_id:'Customer',event_id:'Event'};
export default function TransactionRoutingReview({detail,from,data,account}){
 const matches=routingSourceMatch(detail,from,data.effective_to,data.conditions);
 return <section className="rounded-md border bg-muted/40 p-3 space-y-2 text-sm" aria-label="Proposed recurring rule"><h5 className="font-semibold">Review future matching</h5>
 <p>Destination: {account.account_code||account.code||''} {account.account_name||account.name||'Select an account'}</p>
 <dl className="grid sm:grid-cols-2 gap-2">{Object.entries(labels).map(([key,label])=><div key={key}><dt className="text-muted-foreground">{label}</dt><dd className="break-words">{data.conditions[key]?data.labels[key]||data.conditions[key]:'Any'}</dd></div>)}</dl>
 <p>{from||'Choose start date'} to {data.effective_to||'no end date'} · Priority {data.priority}</p>
 <p role="status" className="font-medium">{matches?'This rule matches the selected transaction’s date and conditions.':'This rule does not match the selected transaction. It can still be saved for future matching transactions.'}</p>
 {!data.conditions.payment_method&&<p>Any payment method is selected: this account may be used for cash, bank, card, InstaPay and wallet transactions that otherwise match.</p>}
 {data.conditions.event_id&&<p className="font-medium">Event-specific rule: this will not cover other events.</p>}
 <p className="text-muted-foreground">Only completed, eligible transactions can post. Existing journals and pending proposals remain unchanged; saving a rule does not recover or post this transaction.</p>
 </section>;
}