import { requireValue } from './financeValidation.js';
import { CATERING_PAYMENT_REFERENCES } from './financeCateringPaymentTypes.js';
export async function automaticFinanceCompanies(ctx,source){
 const page=await ctx.svc.entities.FinanceCompany.filter({is_active:{$ne:false},branch_ids:source.branch_id},{limit:50});
 requireValue(!page.has_more,'Too many companies own this branch. Resolve company ownership.',409);
 const configured=CATERING_PAYMENT_REFERENCES.includes(source.reference_type)&&page.items.length?await ctx.svc.entities.FinanceAccountBinding.aggregate({query:{company_id:{$in:page.items.map(c=>c.id)},mapping_key:{$in:['PAYMENT_METHOD_ACC','CUSTOMER_ADVANCE_ACC','Cancellation_Customer']}},groupBy:'company_id',limit:50}):{rows:[]};
 requireValue(!configured.truncated,'Company mapping ownership is ambiguous.',409);
 const routed=new Set(configured.rows.map(r=>r.company_id));
 if(CATERING_PAYMENT_REFERENCES.includes(source.reference_type)&&page.items.length){
  const methods=await ctx.svc.entities.FinancePaymentMethod.aggregate({query:{company_id:{$in:page.items.map(c=>c.id)}},groupBy:'company_id',limit:50});
  requireValue(!methods.truncated,'Payment-method company ownership is ambiguous.',409);
  methods.rows.forEach(r=>routed.add(r.company_id));
 }
 if(source.reference_type==='catering_payment_void'&&page.items.length){
  const originals=await ctx.svc.entities.FinanceJournal.filter({company_id:{$in:page.items.map(c=>c.id)},branch_id:source.branch_id,status:'posted',source_entity:'JournalEntry','source_summary.reference_id':source.reference_id,kind:{$ne:'reversal'}},{limit:50});
  requireValue(!originals.has_more,'Too many original payment journals. Resolve company ownership.',409);
  originals.items.forEach(j=>routed.add(j.company_id));
 }
 // is_test labels the resulting journal; it must not override an explicitly enabled posting policy.
 return page.items.filter(c=>routed.has(c.id)||c.auto_post_enabled===true);
}