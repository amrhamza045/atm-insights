import { useState } from 'react';
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs';
import useFinanceList from '@/components/finance/useFinanceList';
import FinanceListState from '@/components/finance/FinanceListState';
import useOpenTab from '@/hooks/useOpenTab';
import ClosedTabsNotice from '@/components/modules/ClosedTabsNotice';
import RecoverySources from '@/components/finance/mapping/RecoverySources';
import RecoveryEventCard from '@/components/finance/mapping/RecoveryEventCard';
export default function MappingRecovery({company,can}){
 const [status,setStatus]=useState('');
 const query=useFinanceList({action:'mapping_recovery_list',company_id:company.id,status:status||undefined});
 // Both tabs can be closed in Admin › Modules, per role or per user.
 const tab=useOpenTab('FinanceRecovery',['queue','sources']);
 return <section className="space-y-4"><h2 className="font-semibold">Financial-event recovery rehearsal</h2><p className="text-sm text-muted-foreground">Durable capture, source-revision checks and explicit retry for completed catering advances (P01). Capture and retry never change payments, stock, journals or balances. Other event sources and automatic capture remain unconnected.</p><p className="text-xs text-muted-foreground">Ready means valid at the last check, not posted. Changed sources require a new capture. A failed service call leaves an entry retryable; an interrupted company lock still requires administrator review and is never automatically cleared.</p>{!tab.value?<ClosedTabsNotice/>:<Tabs value={tab.value} onValueChange={tab.setValue}><TabsList>{tab.isOpen('queue')&&<TabsTrigger value="queue">Recovery queue</TabsTrigger>}{tab.isOpen('sources')&&<TabsTrigger value="sources">Sources</TabsTrigger>}</TabsList><TabsContent value="queue" className="space-y-3"><label className="text-sm">Status<select aria-label="Filter recovery status" className="border rounded-md bg-background p-2 ml-2" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['captured','checking','ready','blocked','stale'].map(s=><option key={s}>{s}</option>)}</select></label>{query.items.map(event=><RecoveryEventCard key={event.id} company={company} event={event} can={can}/>)}<FinanceListState query={query}/></TabsContent><TabsContent value="sources"><RecoverySources company={company} can={can}/></TabsContent></Tabs>}</section>;
}