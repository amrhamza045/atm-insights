import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
export default function MappingCoverage({catalogue,onOpen}){
 const [search,setSearch]=useState('');
 return <div className="space-y-4"><p className="text-sm text-muted-foreground">All current manual modules are discovered automatically. Modules without registered posting events remain “Assessment required”, never silently classified as nonposting. Approval counts are configuration coverage, not operational connection coverage.</p><Input aria-label="Search module or financial event" placeholder="Search module, event or source…" value={search} onChange={e=>setSearch(e.target.value)}/>
 {catalogue.modules.filter(m=>`${m.name} ${catalogue.events.filter(e=>e.module===m.name).map(e=>`${e.name} ${e.source_entity}`).join(' ')}`.toLowerCase().includes(search.toLowerCase())).map(module=>{
 const events=catalogue.events.filter(e=>e.module===module.name);
 return <section className="border rounded-lg p-4 space-y-3" key={module.id}><h3 className="font-semibold">{module.name}</h3><p className="text-xs text-muted-foreground">{module.domain} · {module.entities.join(', ')||'Source classification pending'}</p>{!events.length&&<p className="text-sm">Assessment required: shared financial events or nonposting behavior must be classified during source integration.</p>}
 {events.map(event=>{const counts=catalogue.coverage.filter(c=>c.event_type===event.id);const approved=counts.find(c=>c.status==='approved')?.count||0;return <div key={event.id} className="border-t pt-3 flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium">{event.id} · {event.name}</p><p className="text-xs text-muted-foreground">{event.source_entity} · {approved?'Approved configuration exists':'Unmapped / not approved'} · Adapter not connected</p><p className="text-xs text-muted-foreground">{counts.map(c=>`${c.count} ${c.status} versions`).join(' · ')||'No saved versions'}</p></div><Button variant="outline" size="sm" onClick={()=>onOpen({event_type:event.id})}>Configure</Button></div>;})}</section>;
 })}</div>;
}