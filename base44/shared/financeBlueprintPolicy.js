import { requireValue } from './financeValidation.js';
export function blueprintPolicy(event,data){
 if(!event.section)return {};
 const policy={...event.processing_policy,...(data.processing_policy||{})};
 requireValue(policy.valuation===event.processing_policy.valuation,'The valuation method must preserve the source event accounting basis. Use a separately supported event for another method.');
 requireValue(['none','manual','quantity','value','weight'].includes(policy.landed_cost_allocation),'Choose a supported landed-cost allocation basis.');
 requireValue(event.id==='B08'?policy.landed_cost_allocation!=='none':policy.landed_cost_allocation==='none','Landed-cost allocation applies to goods receipt only.');
 requireValue(policy.collection_percent===null||typeof policy.collection_percent==='number'&&policy.collection_percent>=0&&policy.collection_percent<=100,'Advance collection percentage must be 0–100.');
 requireValue(policy.recognition_timing===event.processing_policy.recognition_timing,'Recognition timing must match the event policy.');
 return {processing_policy:{valuation:policy.valuation,landed_cost_allocation:policy.landed_cost_allocation,collection_percent:policy.collection_percent,recognition_timing:policy.recognition_timing}};
}