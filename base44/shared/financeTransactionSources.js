import { requireValue, validDate } from './financeValidation.js';
export const TRANSACTION_SOURCES=[
 {entity:'JournalEntry',name:'Operational journals',query:{posted:true},date:'entry_date',amount:'total_debit',live:true},
 {entity:'CateringPayment',name:'Catering payments and refunds',query:{status:'completed',opening_balance:{$ne:true}},date:'payment_date',amount:'amount',live:true},
 {entity:'Order',name:'Paid / completed sales',query:{status:{$in:['paid','completed']}},date:'created_date',amount:'total',live:true},
 {entity:'PurchaseInvoice',name:'Posted supplier invoices',query:{status:'posted'},date:'invoice_date',amount:'total_amount',live:true},
 {entity:'Expense',name:'Approved expenses',query:{status:'approved'},date:'expense_date',amount:'amount'},
 {entity:'PayrollDisbursement',name:'Paid payroll disbursements',query:{status:'paid'},date:'confirmed_at',amount:'amount'},
 {entity:'SalaryRecord',name:'Paid salary records (reconcile with disbursements)',query:{payment_status:'paid'},date:'payment_date',amount:'net_salary'},
 {entity:'Return',name:'Approved / completed customer returns',query:{status:{$in:['approved','completed']}},date:'return_date',amount:'refund_amount'},
 {entity:'BalanceRecharge',name:'Approved wallet collections',query:{status:'approved'},date:'created_date',amount:'amount_paid'},
 {entity:'WasteDeclaration',name:'Approved waste and food tastings',query:{status:'approved'},date:'waste_date',amount:'cost_impact',live:true,inventory:true},
 {entity:'InventoryAccountingMovement',name:'Event close stock costs (COGS)',query:{source_entity:'CateringEvent',status:'applied'},date:'entry_date',amount:'amount',live:true,inventory:true},
 {entity:'CateringCostException',name:'Active catering cost exceptions',query:{status:'active'},date:'recorded_at',amount:'amount'},
 {entity:'ProductionOrder',name:'Completed production valuations',query:{status:'completed'},date:'created_date',amount:'total_cost'},
 {entity:'CateringReturnedItem',name:'Catering returned inventory valuations',query:{},date:'created_date',amount:'total_value'},
 {entity:'EmployeeBorrowing',name:'Active / completed staff advances',query:{status:{$in:['active','completed']}},date:'borrow_date',amount:'amount'},
 {entity:'CashierPurchase',name:'Approved cashier purchases',query:{status:'approved'},date:'purchase_date',amount:'total_amount'},
 {entity:'Deposit',name:'Cashier deposits / transfers',query:{},date:'deposit_date',amount:'amount'},
 {entity:'KitchenReleaseSlip',name:'Released inventory (valuation evidence required)',query:{status:{$in:['released','received','fulfilled']}},date:'fulfilled_date',amount:null},
 {entity:'CateringReconciliation',name:'Finalized event reconciliations (event invoice)',query:{status:'finalized'},date:'event_date',amount:'final_billing_total'},
];
export function transactionSource(entity){const def=TRANSACTION_SOURCES.find(s=>s.entity===entity);requireValue(def,'Unsupported financial source.');return def;}
export function transactionEligible(def,s){return Object.entries(def.query).every(([key,value])=>value?.$in?value.$in.includes(s[key]):value&&typeof value==='object'&&'$ne' in value?s[key]!==value.$ne:s[key]===value);}
export function transactionAmount(def,s){const value=s[def.amount];return value==null&&def.entity==='JournalEntry'&&Array.isArray(s.entries)?s.entries.reduce((n,l)=>n+Number(l.debit||0),0):value==null?null:Number(value);}
export function transactionDate(def,s){return String(s[def.date]||'').slice(0,10);}
export function transactionSnapshot(s){const {updated_date,created_date,created_by_id,created_by,...data}=s;return data;}
export function transactionRange(input){const range={};if(input.from){requireValue(validDate(input.from),'Invalid start date.');range.$gte=input.from;}if(input.to){requireValue(validDate(input.to),'Invalid end date.');range.$lt=new Date(Date.parse(input.to)+86400000).toISOString().slice(0,10);}requireValue(!input.from||!input.to||input.from<=input.to,'Start date must not follow end date.');return range;}
export function transactionSuggestion(reason){
 if(/locked|closed/i.test(reason))return 'Do not alter the closed period. Prepare an evidenced one-time correction in an open period for independent review.';
 if(/pending|proposal/i.test(reason))return 'Have a different authorized reviewer decide the pending proposal; do not create a second journal.';
 if(/ambiguous|multiple|duplicate|already/i.test(reason))return 'Reconcile linked journals and overlapping routing before retrying; never delete posted entries.';
 if(/currency/i.test(reason))return 'Correct the company/source currency evidence; this flow never invents an exchange rate.';
 if(/mapping|map |account/i.test(reason))return 'Define the missing account routing, preview the exact journal, then confirm this transaction separately.';
 if(/disabled|start date/i.test(reason))return 'Review the relevant automatic posting settings and effective date, enable only after confirmation, then preview and retry.';
 if(/no operational/i.test(reason))return 'Reconcile the missing operational journal or submit a source-linked one-time journal; do not infer a payment.';
 return 'Review source evidence and accounting treatment, inspect routing, or submit a one-time correction for independent review.';
}