import { useState } from 'react';
import { Button } from '@/components/ui/button';
import TransactionAudit from '@/components/finance/transactions/TransactionAudit';
import FinanceAuditHistory from '@/components/finance/audit/FinanceAuditHistory';

export default function FinanceAudit(props) {
 const [view,setView]=useState('exceptions');
 return <section className="space-y-4">
  <div role="group" aria-label="Financial audit view" className="flex flex-wrap gap-2">
   <Button variant={view==='exceptions'?'default':'outline'} onClick={()=>setView('exceptions')}>Mapping exceptions</Button>
   <Button variant={view==='history'?'default':'outline'} onClick={()=>setView('history')}>Change history</Button>
  </div>
  {view==='exceptions'?<TransactionAudit key={JSON.stringify(props.filters)} {...props} initialMapping="exceptions"/>:<FinanceAuditHistory {...props}/>}
 </section>;
}