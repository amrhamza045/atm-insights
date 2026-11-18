// The Executive Dashboard's pages and the reports on each page.
// module: the Admin › Modules switch whose data the report shows. While that
// module is off (for everyone, or in this person's own module access) the
// report leaves the dashboard, a page with no open report disappears, and the
// report's own switch is listed under that module. Reports without a module
// belong to the dashboard itself.
// filter: "catering" shows the venue / event type / package filter bar.
// period: shows the standard period bar (MTD, last month, QTD, YTD, 12M and
// the comparison: previous period, same period last year or budget).
// With both, the period bar sets the dates and the filter bar drops its own.
const cateringPeriod = { module: "catering", filter: "catering", period: true, budget: false };
// Cost & supply, People and Customers & growth have no budget of their own to compare with.
const supplyPeriod = { period: true, budget: false };

export const REPORT_PAGES = [
  {
    key: "overview",
    label: "Overview",
    reports: [{ value: "summary", label: "Executive Summary", period: true }],
  },
  {
    key: "financial",
    label: "Financial performance",
    reports: [
      { value: "pnl", label: "Profit & Loss", module: "financial", period: true },
      { value: "revenue", label: "Revenue", module: "financial", period: true },
      { value: "costs", label: "Costs & Budget", module: "financial", period: true },
      { value: "cash", label: "Cash & Balances", module: "financial", period: true },
      { value: "branches", label: "Branch Comparison", module: "branch_comparison", period: true },
    ],
  },
  {
    key: "catering",
    label: "Catering",
    reports: [
      { value: "catering", label: "Event P&L", ...cateringPeriod },
      { value: "pipeline", label: "Bookings & Pipeline", ...cateringPeriod },
      { value: "costvariance", label: "Cost Variance", ...cateringPeriod },
      { value: "lossanalysis", label: "Loss Analysis", ...cateringPeriod },
      { value: "cateringstaffing", label: "Catering Staffing", ...cateringPeriod },
      { value: "cateringequipment", label: "Equipment & Returns", ...cateringPeriod, module: "assets_resources" },
      { value: "clientfeedback", label: "Client Feedback", ...cateringPeriod },
      { value: "advisor", label: "Catering Advisor", ...cateringPeriod },
    ],
  },
  {
    key: "cost",
    label: "Cost & supply",
    reports: [
      { value: "stockwaste", label: "Stock & Waste", module: "inventory", ...supplyPeriod },
      { value: "purchasing", label: "Purchasing", module: "purchases", ...supplyPeriod },
      { value: "suppliers", label: "Suppliers", module: "suppliers", ...supplyPeriod },
      { value: "dishes", label: "Dish Performance", module: "menu_profitability", ...supplyPeriod },
      { value: "kitchen", label: "Kitchen Performance", module: "manufacturing", ...supplyPeriod },
    ],
  },
  {
    key: "people",
    label: "People",
    reports: [
      { value: "labor", label: "Labor Cost", module: "hr_payroll", ...supplyPeriod },
      { value: "attendance", label: "Attendance & Hours", module: "hr_attendance", ...supplyPeriod },
      { value: "workforce", label: "Workforce", module: "hr_employees", ...supplyPeriod },
    ],
  },
  {
    key: "customers",
    label: "Customers & growth",
    reports: [
      { value: "leads", label: "Leads & Sources", module: "crm", ...supplyPeriod },
      { value: "clients", label: "Clients & Retention", module: "client_analytics", ...supplyPeriod },
      { value: "care", label: "Client Care", module: "crm", ...supplyPeriod },
    ],
  },
  {
    key: "insights",
    label: "Alerts & insights",
    reports: [
      // As of today across the modules switched on; no period of their own.
      { value: "alerts", label: "Alerts Center" },
      { value: "predict", label: "Predictive Analytics", module: "catering" },
      { value: "ai", label: "AI Business Insights", ...supplyPeriod },
    ],
  },
];