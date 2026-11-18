export const TEMPLATE_VERSION = 'coa-document-2026-10-v1';
const groups = [
 ['100000','Assets','assets','debit',`110100|Cash on Hand
110200|Petty Cash
110300|Bank Accounts
110400|Cash in Transit
110500|Card Settlement Receivable
110600|Payment Gateway Receivable
110700|Delivery Aggregator Receivable
111100|Trade Receivables
111200|Allowance for Expected Credit Losses
111300|Employee Advances
111400|Supplier Advances
111500|Other Receivables
112100|Raw Material Inventory
112200|Packaging Inventory
112300|Work in Progress
112400|Finished Goods Inventory
112500|Merchandise Inventory
112600|Inventory in Transit
112700|Inventory Valuation Allowance
113100|Recoverable Input Tax
113200|Prepaid Rent
113300|Prepaid Insurance
113400|Prepaid Software and Subscriptions
113500|Other Prepayments
113600|Refundable Deposits
113700|Income Tax Receivable
113800|Withholding Tax Receivable
113900|VAT Settlement / Refunds Receivable
114100|Intercompany Receivables
120100|Buildings and Leasehold Improvements
120200|Kitchen and Production Equipment
120300|Furniture and Fixtures
120400|POS, IT, and Office Equipment
120500|Vehicles
120600|Construction / Assets in Progress
120700|Right-of-Use Assets
121100|Accumulated Depreciation
122100|Software and Intangible Assets
122200|Accumulated Amortization
123100|Deferred Tax Asset`],
 ['200000','Liabilities','liabilities','credit',`210100|Trade Payables
210200|Goods Received Not Invoiced
210300|Accrued Operating Expenses
210400|Salaries and Wages Payable
210500|Payroll Deductions Payable
210600|Social Insurance / Benefits Payable
210700|Output Tax Payable
210800|Withholding Tax Payable
210900|Income Tax Payable
211100|Customer Deposits and Advances
211200|Gift Card / Stored Value Liability
211300|Loyalty Contract Liability
211400|Cashback / Referral Rewards Payable
211500|Tips Payable
211600|Refunds Payable
211700|Short-Term Borrowings
211800|Current Lease Liabilities
211900|Intercompany Payables
220100|Long-Term Borrowings
220200|Non-Current Lease Liabilities
220300|Employee Benefit Provisions
220400|Other Provisions
220500|Deferred Tax Liability`],
 ['300000','Equity','equity','credit',`310100|Share Capital
310200|Additional Paid-in Capital
310300|Statutory and Other Reserves
310400|Retained Earnings
310500|Current-Year Earnings
310600|Dividends / Owner Distributions`],
 ['400000','Revenue and deductions','revenue','credit',`410100|Food Sales
410200|Beverage Sales
410300|Catering and Events Revenue
410400|Merchandise / Grocery Sales
410500|Pharmacy Product Sales
410600|Delivery Fee Revenue
410700|Service Charge Revenue
410800|Other Operating Revenue
410900|Intercompany Sales
419100|Sales Discounts
419200|Sales Returns and Allowances
419300|Customer Cashback / Promotional Rebates`],
 ['500000','Cost of sales and production','cogs','debit',`510100|Food / Ingredient Cost of Sales
510200|Beverage Cost of Sales
510300|Merchandise Cost of Sales
510400|Pharmacy Cost of Sales
510500|Packaging Cost of Sales
510600|Catering Cost of Sales
510700|Intercompany Cost of Sales
511100|Inventory Spoilage and Expiry
511200|Inventory Shrinkage / Count Variances
511300|Inventory Write-Downs
511400|Production / Recipe Variances
511500|Unallocated Production Overhead
520100|Production Labor Cost Pool
520200|Production Utilities Cost Pool
520300|Production Occupancy Cost Pool
520400|Production Depreciation Cost Pool
520500|Other Production Overhead Cost Pool
529100|Production Cost Absorption`],
 ['600000','Operating expenses','operating_expenses','debit',`610100|Branch / Service Staff Salaries
610200|Administrative Salaries
610300|Employer Contributions and Benefits
610400|Recruitment and Training
620100|Premises Rent
620200|Electricity, Water, and Gas
620300|Repairs and Maintenance
620400|Cleaning and Pest Control
620500|Security
620600|Insurance
630100|Advertising and Marketing
630200|Delivery Aggregator Commissions
630300|Card and Payment Gateway Fees
630400|Third-Party Delivery Costs
630500|Customer Acquisition / Referral Expenses
630600|Promotional Samples and Complimentary Meals
640100|Software and Subscriptions
640200|Telephone and Internet
640300|Professional, Legal, and Audit Fees
640400|Licenses and Permits
640500|Office Supplies
640600|Travel and Transportation
640700|Expected Credit Loss Expense
640800|Cash Shortages / Overages
640900|Other Administrative Expenses
650100|Operating Asset Depreciation
650200|Intangible Asset Amortization
650300|Operating Asset Impairment`],
 ['700000','Other result and finance','other_result','credit',`710100|Interest Income
710200|Gain on Asset Disposal
710300|Foreign Exchange Gains
710400|Other Non-Operating Income
720100|Loan Interest Expense
720200|Lease Interest Expense
720300|Financing Fees
720400|Foreign Exchange Losses
720500|Loss on Asset Disposal
720600|Other Non-Operating Expenses`],
 ['800000','Income tax','income_tax','debit',`810100|Current Income Tax Expense
810200|Deferred Income Tax Expense / Benefit`],
];
export function mappingFor(code, classification) {
 if (code.startsWith('419')) return 'revenue_deductions';
 if (code.startsWith('520') || code === '529100') return 'production_pool';
 if (code.startsWith('650') && code !== '650300') return 'depreciation_amortization';
 if (code === '710100') return 'finance_income';
 if (['720100','720200','720300'].includes(code)) return 'finance_costs';
 return classification;
}
export const MASTER_ACCOUNTS = groups.flatMap(([parent,name,classification,normal,rows]) => [
 {code:parent,name,classification,normal_balance:normal,posting:false,parent_code:'',management_mapping:classification},
 ...rows.split('\n').map(row => {const [code,name]=row.split('|'); return {code,name,classification,parent_code:parent,posting:true,normal_balance:['111200','112700','121100','122200','529100'].includes(code)?'credit':(code.startsWith('419')||code.startsWith('720')||code==='310600')?'debit':normal,management_mapping:mappingFor(code,classification)};})
]);