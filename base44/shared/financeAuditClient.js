import { trackedFinanceEntities,auditSnapshot,auditScopes,auditChangedFields,auditAction } from './financeAuditSnapshot.js';
// Intercepts only saved financial data, not locks, reporting indexes or reads.
// Existing accounting mutations retain their result even if audit storage fails.
export function financeAuditClient(ctx){
 const raw=ctx.base44.asServiceRole,cache=new Map();
 async function record(entity,previous,saved){
  try{
   const before=auditSnapshot(previous,entity),after=auditSnapshot(saved,entity);
   if(!after)return;
   for(const scope of auditScopes(entity,before,after)){
    const changed_fields=auditChangedFields(scope.before,scope.after);
    if(!scope.company_id||!changed_fields.length)continue;
    const automatic=entity==='FinanceJournal'&&after.kind==='automatic';
    await raw.entities.FinanceAuditEvent.create({company_id:scope.company_id,branch_id:scope.branch_id,actor_id:ctx.user.id,actor_email:ctx.user.email,actor_name:ctx.user.full_name||'',actor_type:automatic?'automatic_posting':'user',request_id:ctx.auditRequestId,operation:ctx.auditOperation||`${entity}.${previous?'update':'create'}`,action:auditAction(entity,scope.before,scope.after),entity_type:entity,entity_id:after.id||'',entity_label:after.description||after.name||after.source_label||after.invoice_number||(after.records?'Account template installation':after.id)||'',before:scope.before,after:scope.after,changed_fields,reason:after.review_note||after.lock_reason||after.evidence_note||after.notes||'',source_entity:after.source_entity||'',source_id:after.source_id||''});
   }
  }catch(error){console.error('Detailed Finance audit storage failed:',error.message);}
 }
 const entities=new Proxy(raw.entities,{get(target,entity){
  const handler=target[entity];if(!trackedFinanceEntities.has(entity)||!handler)return handler;
  if(!cache.has(entity))cache.set(entity,new Proxy(handler,{get(t,method){
   const fn=t[method];
   if(method==='create')return async data=>{const saved=await fn.call(t,data);await record(entity,null,saved);return saved;};
   if(method==='update')return async(id,data)=>{
    const meaningful=Object.keys(auditSnapshot(data,entity)||{}).length>0;
    const before=meaningful?await t.get(id):null,saved=await fn.call(t,id,data);
    if(meaningful)await record(entity,before,saved);return saved;
   };
   if(method==='bulkCreate')return async rows=>{const saved=await fn.call(t,rows);if(rows.length)await record(entity,null,{company_id:rows[0].company_id,records:Array.isArray(saved)?saved.map(r=>auditSnapshot(r,entity)):rows.map(r=>auditSnapshot(r,entity))});return saved;};
   return typeof fn==='function'?fn.bind(t):fn;
  }}));return cache.get(entity);
 }});
 return new Proxy(raw,{get(t,key){const value=key==='entities'?entities:t[key];return typeof value==='function'?value.bind(t):value;}});
}