import { requireValue } from './financeValidation.js';
import { healthPostingLinks,healthSourceLinks } from './financeHealthPostingLinks.js';
import { assessHealthSource } from './financeHealthSourceAssessment.js';
import { healthPostingPath,healthFinalityNote } from './financeHealthPostingPaths.js';
export const HEALTH_COUNTERS=['matched','missing','duplicate','changed','amount_mismatch','unverified','pending','blocked','reporting','not_required'];
export async function healthPostingPage(ctx,company,def,scope,query,cursor){
 const db=ctx.svc.entities,[total,page]=await Promise.all([db[def.entity].count(query),db[def.entity].filter(query,{sort:'created_date',limit:25,...(cursor?{cursor}:{})})]);
 const result={entity:def.entity,name:def.name,total,checked:page.items.length,...Object.fromEntries(HEALTH_COUNTERS.map(k=>[k,0])),examples:[],samples:[],has_more:page.has_more,next_cursor:page.next_cursor||'',path:healthPostingPath(company,def.entity),finality_note:healthFinalityNote(def.entity)};
 if(!page.items.length)return result;
 const evidence=await healthPostingLinks(ctx,company,def,page.items,scope);
 for(const source of page.items){
  let row;
  try{row=assessHealthSource(company,def,source,healthSourceLinks(def,source,evidence),evidence);}catch(error){if(![400,409].includes(error.status))throw error;row={source_id:source.id,status:'unverified',reason:error.message,journal_ids:[]};}
  requireValue(HEALTH_COUNTERS.includes(row.status),'Unknown evidence assessment.');result[row.status]++;
  if(result.samples.length<10)result.samples.push(row);
  if(!['matched','not_required'].includes(row.status)&&result.examples.length<10)result.examples.push(row);
 }
 return result;
}