import { financeManualReports } from './financeManualReports.js';
import { financeManualControls } from './financeManualControls.js';
import { financeManualTaxes } from './financeManualTaxes.js';
import { financeManualComparison } from './financeManualComparison.js';
import { financeManualAudit } from './financeManualAudit.js';
import { financeManualMapping } from './financeManualMapping.js';
import { financeManualCompanyDefinition } from './financeManualCompanyDefinition.js';
import { financeHealthManual } from './financeHealthManual.js';
import { financeTransactionManual } from './financeTransactionManual.js';
import { financeManualCustomers } from './financeManualCustomers.js';
import { financeManualOpening } from './financeManualOpening.js';

// Finance navigation and its manual share this catalog. Register every new
// section/report here with its description, accuracy advice and recommendations.
const order=['overview','dashboard','comparison','channels','recipe_changes','vat','einvoices','tax_system','accounts','proposals','journals','statements','customers','suppliers','planning','health','integrity','mapping','automatic','opening','legacy','controls','audit','manual'];
export function financeManualCatalog() {
 const sections=[...financeManualControls,...financeManualReports,...financeManualTaxes,...financeManualComparison,...financeManualAudit,...financeManualMapping,...financeManualCompanyDefinition,...financeHealthManual,...financeTransactionManual,...financeManualCustomers,...financeManualOpening];
 const seen=new Set();
 const text=value=>typeof value==='string'&&value.trim().length>0;
 const list=value=>Array.isArray(value)&&value.length>0&&value.every(text);
 for(const section of sections){
  if(!text(section.id)||seen.has(section.id)||!text(section.title)||!text(section.description)||!list(section.steps)||!list(section.checks)||!list(section.recommendations)||!Array.isArray(section.reports))throw new Error(`Incomplete Finance manual section: ${section.id||'unnamed'}`);
  seen.add(section.id);
  const reports=new Set();
  for(const report of section.reports){
   if(!['title','description','accuracy','recommendation'].every(key=>text(report[key]))||reports.has(report.title))throw new Error(`Incomplete Finance report guidance: ${section.id}/${report.title||'unnamed'}`);
   reports.add(report.title);
  }
 }
 return sections.sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):order.length)-(order.includes(b.id)?order.indexOf(b.id):order.length));
}
export function visibleFinanceSections(ctx) {
 return financeManualCatalog().filter(section=>!section.permission||ctx.admin||ctx.permissions[section.permission]===true);
}
export function financeFeatures(ctx) {
 return visibleFinanceSections(ctx).filter(section=>section.tab!==false).map(({id,title})=>({id,title}));
}
export async function financeManualDefinition() {
 const sections=financeManualCatalog();
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(sections)));
 const version=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
 return {version,sections,section_count:sections.length,report_count:sections.reduce((n,s)=>n+s.reports.length,0)};
}