import { BLUEPRINT_EVENTS, BLUEPRINT_SECTIONS } from './financeBlueprint.js';
import { requireValue } from './financeValidation.js';
import { BLUEPRINT_SOURCES, SOURCE_LABELS } from './financeBlueprintSources.js';
import { healthPostingPath } from './financeHealthPostingPaths.js';
import { PAYMENT_ACCOUNT_KEYS } from './financePaymentMethodSource.js';
export async function financeBlueprintReview(ctx,company){
 requireValue(ctx.admin||!ctx.permissions.branch_id,'Joint mapping review requires unrestricted company access.',403);
 const [versions,bindings,methods]=await Promise.all([
  ctx.svc.entities.FinanceMappingVersion.aggregate({query:{company_id:company.id,status:'approved',event_type:{$in:BLUEPRINT_EVENTS.map(e=>e.id)}},groupBy:'event_type',limit:100}),
  ctx.svc.entities.FinanceAccountBinding.aggregate({query:{company_id:company.id},groupBy:'mapping_key',limit:500}),
  ctx.svc.entities.FinancePaymentMethod.count({company_id:company.id,is_active:true})
 ]);
 requireValue(!versions.truncated&&!bindings.truncated,'Configuration exceeds review limits.');
 // Cash and bank keys are covered by active payment methods, not by mapping rules.
 const keys=[...new Set(BLUEPRINT_EVENTS.flatMap(e=>e.lines.map(l=>l.account_key)))],bound=new Set([...bindings.rows.map(b=>b.mapping_key).filter(k=>!PAYMENT_ACCOUNT_KEYS.includes(k)),...(methods?PAYMENT_ACCOUNT_KEYS:[])]);
 const events=BLUEPRINT_EVENTS.map(e=>{const src=BLUEPRINT_SOURCES[e.id],live=src.entity?healthPostingPath(company,src.entity):null;return {id:e.id,name:e.name,section_title:BLUEPRINT_SECTIONS.find(s=>s.id===e.section).title,approved:versions.rows.find(v=>v.event_type===e.id)?.count||0,source_status:src.status,source_label:SOURCE_LABELS[src.status],source:src.source,route:src.route||'',route_enabled:live&&live.workflow!=='No dedicated source workflow implemented'?live.enabled:null,blocker:src.blocker};});
 const missing=keys.filter(k=>!bound.has(k)),unapproved=events.filter(e=>!e.approved),count=s=>events.filter(e=>e.source_status===s).length;
 const blockers=[...(missing.length?[`Unmapped default account keys: ${missing.join(', ')}.`]:[]),...(unapproved.length?[`${unapproved.length} default posting patterns have no independently approved rule.`]:[]),`${count('live_route')} patterns are already posted by existing routes; activating them here would post twice until those routes are deliberately migrated.`,`${count('not_connected')} patterns have a source record but no posting route.`,`${count('source_missing')} patterns have no operational source record in the app.`];
 return {events,blockers,posting_enabled:false,activation_mode:'all_together_after_review',note:`All ${BLUEPRINT_SECTIONS.length} sections will activate together only after the complete configuration and source integrations have passed review. No partial activation is allowed by this workspace.`};
}