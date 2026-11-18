import { requireValue, validDate } from './financeValidation.js';
import { MAPPING_EVENTS } from './financeMappingCatalogue.js';
export const MAPPING_BASES=['net','tax','gross','discount','liability_application','inventory_carrying_cost','commission','retention','withholding','payroll_component','rounded_residual','depreciation','loss','gain','service','delivery'];
import { BINDING_CONDITIONS } from './financeBindingResolver.js';
import { blueprintPolicy } from './financeBlueprintPolicy.js';
export const MAPPING_CONDITIONS=BINDING_CONDITIONS;
export const MAPPING_DIMENSIONS=['branch_id','event_id','cost_center','department','warehouse','customer_id','supplier_id','channel','currency','batch_id','asset_id','campaign_id','category','payment_method','bank_cash_id','event_type_id','service_type_id','return_reason_code','original_tx_id'];
export function mappingDefinition(company,data,{historical=false}={}){
 requireValue(data&&typeof data==='object'&&!Array.isArray(data),'Provide a mapping definition.');
 const event=MAPPING_EVENTS.find(e=>e.id===data.event_type);requireValue(event,'Choose a registered financial event.');
 requireValue(typeof data.name==='string'&&data.name.trim()&&data.name.length<=160,'Rule name is required (maximum 160 characters).');
 requireValue(validDate(data.effective_from)&&(!data.effective_to||validDate(data.effective_to)),'Choose valid effective dates.');requireValue(!data.effective_to||data.effective_to>=data.effective_from,'Effective dates are reversed.');
 requireValue(historical||!company.closed_through||data.effective_from>company.closed_through,'A new mapping cannot begin in a closed period.');
 requireValue(Number.isInteger(data.priority)&&data.priority>=0&&data.priority<=1000,'Priority must be an integer from 0 to 1000.');
 const conditions=data.conditions||{};requireValue(typeof conditions==='object'&&!Array.isArray(conditions)&&Object.keys(conditions).every(k=>MAPPING_CONDITIONS.includes(k)),'Unsupported match conditions.');
 for(const [k,v] of Object.entries(conditions)){requireValue(typeof v==='string'&&v.length>0&&v.length<=120,'Conditions must be nonempty text values.');if(k==='branch_id')requireValue(company.branch_ids.includes(v),'Condition branch is outside this company.');if(k==='currency')requireValue(v===company.currency,'Foreign-currency adapters are not connected in this phase.');}
 const dims=data.required_dimensions;requireValue(Array.isArray(dims)&&dims.length<=MAPPING_DIMENSIONS.length&&dims.every(d=>MAPPING_DIMENSIONS.includes(d))&&event.required_dimensions.every(d=>dims.includes(d)),'Required source dimensions cannot be omitted.');
 requireValue(Array.isArray(data.lines)&&data.lines.length>=2&&data.lines.length<=30,'Provide 2–30 journal template lines.');
 const lines=data.lines.map(l=>{requireValue(l&&typeof l==='object'&&!Array.isArray(l),'Invalid journal line configuration.');requireValue(['debit','credit'].includes(l.side)&&MAPPING_BASES.includes(l.basis)&&['reject','reverse'].includes(l.negative_behavior),'Invalid journal line configuration.');const keyed=typeof l.account_key==='string'&&/^(?:Cancellation_Customer|[A-Z][A-Z0-9_]{1,79})$/.test(l.account_key);requireValue(keyed?!l.account_id:!l.account_key&&typeof l.account_id==='string'&&l.account_id&&l.account_id.length<=120,'Map each line to either a semantic account key or a chart account.');return {side:l.side,basis:l.basis,account_id:keyed?'':l.account_id,account_key:keyed?l.account_key:'',role:String(l.role||'').slice(0,80),negative_behavior:l.negative_behavior};});
 requireValue(lines.some(l=>l.side==='debit')&&lines.some(l=>l.side==='credit'),'Include both debit and credit lines.');
 requireValue(typeof data.policy_reference==='string'&&data.policy_reference.trim()&&data.policy_reference.length<=1000,'An accounting policy reference is required.');
 requireValue(typeof(data.description||'')==='string'&&(data.description||'').length<=2000,'Description is too long.');
 return {event_type:event.id,name:data.name.trim(),description:data.description||'',policy_reference:data.policy_reference.trim(),effective_from:data.effective_from,effective_to:data.effective_to||'',priority:data.priority,conditions,required_dimensions:[...new Set(dims)],lines,...blueprintPolicy(event,data)};
}
export function overlaps(a,b){return a.event_type===b.event_type&&a.priority===b.priority&&a.effective_from<=(b.effective_to||'9999-12-31')&&b.effective_from<=(a.effective_to||'9999-12-31')&&!MAPPING_CONDITIONS.some(k=>a.conditions?.[k]&&b.conditions?.[k]&&a.conditions[k]!==b.conditions[k]);}
export function mappingMatches(rule,sample){return sample.date>=rule.effective_from&&sample.date<=(rule.effective_to||'9999-12-31')&&Object.entries(rule.conditions||{}).every(([k,v])=>(sample.dimensions?.[k]||'')===v);}
export function decimalUnits(value,decimals){
 const text=String(value??'');requireValue(/^-?\d+(\.\d+)?$/.test(text)&&text.length<=30,'Amount bases must contain decimal numbers, not expressions.');
 const negative=text.startsWith('-'),parts=text.replace(/^-/,'').split('.'),fraction=parts[1]||'';requireValue(fraction.length<=decimals,`Amounts support ${decimals} decimal places.`);
 const units=BigInt(parts[0])*10n**BigInt(decimals)+BigInt(fraction.padEnd(decimals,'0')||'0');requireValue(units<=BigInt(Number.MAX_SAFE_INTEGER),'Amount exceeds safe reporting precision.');return Number(negative?-units:units);
}