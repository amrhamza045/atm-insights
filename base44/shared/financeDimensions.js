const text=v=>typeof v==='string'?v.trim().slice(0,200):'';
const SERVICES=new Set(['dine_in','takeaway','delivery','catering','drive_through']);
const ORIGINS=new Set(['pos','website','call_center','voice','captain']);
export async function financeDimensions(ctx,journal){
 const candidates=[journal.source_entity==='Order'?journal.source_id:'',journal.source_summary?.reference_id,...journal.lines.map(l=>l.product_reference)].filter(id=>typeof id==='string'&&/^[a-f\d]{24}$/i.test(id));
 const ids=[...new Set(candidates)],orders=ids.length?(await ctx.svc.entities.Order.filter({id:{$in:ids},branch_id:journal.branch_id},{limit:101})).items:[],byId=new Map(orders.map(o=>[o.id,o]));
 const voices=[...new Set(orders.map(o=>o.voice_order_id).filter(Boolean))],voiceRows=voices.length?(await ctx.svc.entities.VoiceOrder.filter({id:{$in:voices}},{limit:101,fields:['is_call_center_order','branch_id']})).items:[],byVoice=new Map(voiceRows.map(v=>[v.id,v]));
 const sourceOrder=journal.source_entity==='Order'?byId.get(journal.source_id):byId.get(journal.source_summary?.reference_id);
 return line=>{const o=byId.get(line.product_reference)||sourceOrder,channel=text(line.channel).toLowerCase(),voice=o&&byVoice.get(o.voice_order_id);let origin=text(o?.order_origin||o?.order_source);
 if(!origin||origin==='voice'){if(o?.is_call_center_order||voice?.is_call_center_order&&(!voice.branch_id||voice.branch_id===journal.branch_id))origin='call_center';else if(o?.notes?.includes('[Website Order'))origin='website';else if(o?.voice_order_id)origin='voice';else origin=ORIGINS.has(channel)?channel:'';}
 return {service_type:text(o?.order_type)||(SERVICES.has(channel)?channel:'unassigned'),order_origin:origin||'unassigned',delivery_partner_id:text(o?.delivery_company_id)||'unassigned'};};
}