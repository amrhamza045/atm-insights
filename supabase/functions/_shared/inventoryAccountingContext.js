import { requireValue } from './financeValidation.js';
import { inventoryPolicy } from './inventoryAccountingRules.js';
import { getCompanyOffset, dayInOffset, TIMEZONE_MISSING } from './companyTimezone.js';
export async function inventoryOwner(db,branch) {
 const page=await db.FinanceCompany.filter({is_active:{$ne:false},branch_ids:branch},{limit:50});
 requireValue(!page.has_more,'Too many companies own this inventory branch.',409);
 const owners=page.items.filter(c=>inventoryPolicy(c).enabled);
 requireValue(owners.length<=1,'Multiple inventory accounting companies own this branch.',409);
 return owners[0] || null;
}
export async function inventoryDate(db,timestamp=new Date().toISOString()) {
 const offset=await getCompanyOffset(db);requireValue(offset!==null,TIMEZONE_MISSING);
 requireValue(Number.isFinite(Date.parse(timestamp)),'Stock movement timestamp is missing.');return dayInOffset(timestamp,offset);
}
export async function inventoryRecord(ctx,company,data) {
 const db=ctx.svc.entities, prior=await db.InventoryAccountingMovement.filter({company_id:company.id,movement_key:data.movement_key},{limit:1});
 if(prior.items.length)return prior.items[0];
 return db.InventoryAccountingMovement.create({...data,company_id:company.id,currency:company.currency,actor_email:ctx.user.email});
}