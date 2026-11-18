import { financeManualDefinition, visibleFinanceSections } from './financeManualCatalog.js';

export async function readFinanceManual(ctx) {
 const [definition,page]=await Promise.all([
  financeManualDefinition(),
  ctx.svc.entities.FinanceManualStatus.filter({manual_key:'finance'},{limit:1,sort:'-updated_date'})
 ]);
 const status=page.items[0];
 return {version:definition.version,sections:visibleFinanceSections(ctx),section_count:definition.section_count,report_count:definition.report_count,
  generated_at:status?.content_version===definition.version?status.generated_at:null,
  last_checked_at:status?.last_checked_at||null,verification_current:status?.content_version===definition.version,
  schedule:'Every Sunday at 03:00 Africa/Cairo and after app publication'};
}

export async function refreshFinanceManual(svc) {
 const definition=await financeManualDefinition();
 const page=await svc.entities.FinanceManualStatus.filter({manual_key:'finance'},{limit:1,sort:'-updated_date'});
 const previous=page.items[0],now=new Date().toISOString(),changed=previous?.content_version!==definition.version;
 const data={manual_key:'finance',content_version:definition.version,generated_at:changed?now:previous.generated_at,last_checked_at:now,section_count:definition.section_count,report_count:definition.report_count};
 if(previous)await svc.entities.FinanceManualStatus.update(previous.id,data);
 else await svc.entities.FinanceManualStatus.upsert([data],{key:'manual_key'});
 return {changed,...data};
}