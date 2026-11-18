import { requireValue, validDate } from './financeValidation.js';
import { overlaps, mappingMatches } from './financeMappingValidation.js';
const dayBefore=date=>new Date(Date.parse(date)-86400000).toISOString().slice(0,10);
// A new revision ends its predecessor's applicability, not its stored history.
export function mappingTimeline(rules){
 const groups=new Map();for(const r of rules){if(!groups.has(r.rule_key))groups.set(r.rule_key,[]);groups.get(r.rule_key).push(r);}
 return [...groups.values()].flatMap(versions=>versions.sort((a,b)=>a.effective_from.localeCompare(b.effective_from)||a.version-b.version).map((r,i)=>{
  const next=versions[i+1],end=next?dayBefore(next.effective_from):'9999-12-31';
  return {...r,effective_to:r.effective_to&&r.effective_to<end?r.effective_to:end};
 }));
}
export function mappingConflicts(approved,candidate){
 const timeline=mappingTimeline([...approved.filter(r=>r.id!==candidate.id),candidate]);
 const proposed=timeline.find(r=>r===candidate||r.rule_key===candidate.rule_key&&r.version===candidate.version);
 return timeline.filter(r=>r.rule_key!==candidate.rule_key&&proposed&&overlaps(proposed,r));
}
export function selectMapping(rules,sample){
 requireValue(sample&&validDate(sample.date),'Sample accounting date is required.');
 const matched=mappingTimeline(rules).filter(r=>mappingMatches(r,sample)).sort((a,b)=>b.priority-a.priority);
 requireValue(matched.length,'No approved mapping matches this sample.');
 requireValue(matched.length===1||matched[0].priority!==matched[1].priority,'Ambiguous mapping: equal winning priority.',409);
 return matched[0];
}