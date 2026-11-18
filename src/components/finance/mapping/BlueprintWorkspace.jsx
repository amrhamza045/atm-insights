import { useState } from 'react';
import { Button } from '@/components/ui/button';
import MappingDrivers from '@/components/finance/mapping/MappingDrivers';
import BlueprintPatterns from '@/components/finance/mapping/BlueprintPatterns';
import BlueprintSavedRules from '@/components/finance/mapping/BlueprintSavedRules';
import BlueprintReview from '@/components/finance/mapping/BlueprintReview';
import MappingEditor from '@/components/finance/mapping/MappingEditor';
export default function BlueprintWorkspace({company,catalogue,can}){
 const [section,setSection]=useState('drivers'),[selected,setSelected]=useState(null),[review,setReview]=useState(false);
 const current=catalogue.blueprint_sections.find(s=>s.id===section),events=catalogue.events.filter(e=>e.section===section);
 return <div className="space-y-4"><div className="flex flex-wrap gap-3 items-center justify-between"><div><h3 className="font-semibold">Posting rules · seven-section specification</h3><p className="text-sm text-muted-foreground">VGT-AI-ENG-2026-FULL v2.0 · Configuration only · Activate together after review</p></div><Button variant="outline" onClick={()=>setReview(v=>!v)}>Review all seven sections</Button></div>
 {review&&<BlueprintReview company={company} onClose={()=>setReview(false)}/>}
 <div className="grid lg:grid-cols-[15rem_minmax(0,1fr)] gap-5"><nav aria-label="Accounting specification sections" className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">{catalogue.blueprint_sections.map((s,i)=><Button key={s.id} variant={section===s.id?'default':'outline'} aria-pressed={section===s.id} className="h-auto min-h-10 justify-start text-left whitespace-normal shrink-0" onClick={()=>{setSection(s.id);setSelected(null);}}>{i+1}. {s.title}</Button>)}</nav><div className="space-y-5"><div><h3 className="text-lg font-semibold">{current.title}</h3><p className="text-sm text-muted-foreground">{current.description}</p></div>
 {selected?<MappingEditor key={`${selected.id||selected.event_type}:${selected.updated_date||''}`} company={company} can={can} catalogue={catalogue} rule={selected} onSaved={setSelected} onClose={()=>setSelected(null)}/>:section==='drivers'?<MappingDrivers company={company} catalogue={catalogue} can={can}/>:<><BlueprintPatterns events={events} can={can} onOpen={setSelected}/><BlueprintSavedRules company={company} section={section} onOpen={setSelected}/></>}
 </div></div></div>;
}