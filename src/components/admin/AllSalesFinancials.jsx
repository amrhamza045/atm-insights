import { useState } from "react";
import { companyDateOf } from "@/components/utils/timezoneHelper";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { ShoppingCart, ChevronDown, ChevronRight } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";
import { orderFinancials, paymentSplit, categorizePayment } from "@/components/admin/salesMath";

const buildSummary = (key, name, groupOrders, commissionPct = 0, returnsByOrder = {}) => {
  const totals = { cash: 0, visa: 0, cl: 0, hospitality: 0, instapay: 0, other: 0 };
  let totalSubtotal = 0;
  let totalDiscount = 0;
  let totalOtherAdjustments = 0;
  let totalMinCharge = 0;
  let totalReturns = 0;
  let totalTax = 0;
  let totalService = 0;
  let totalDeliveryFee = 0;

  groupOrders.forEach(o => {
    const f = orderFinancials(o);
    paymentSplit(o).forEach(p => {
      totals[categorizePayment(p.method)] += p.amount;
    });
    totalSubtotal += f.gross;
    totalDiscount += f.declaredDiscount;
    totalOtherAdjustments += f.otherAdjustments;
    totalMinCharge += f.minCharge;
    totalReturns += returnsByOrder[o.id] || 0;
    totalTax += f.tax;
    totalService += f.service;
    totalDeliveryFee += f.delivery;
  });

  const grandTotal = groupOrders.reduce((sum, o) => sum + orderFinancials(o).total, 0);
  // Total Sales = money actually collected: Cash + CL + Visa + Hospitality + Instapay
  const paymentsTotal = totals.cash + totals.cl + totals.visa + totals.hospitality + totals.instapay;
  // Net Sales = Total Sales - (discounts + offers/manual adjustments + returns)
  const netSales = paymentsTotal - (totalDiscount + totalOtherAdjustments + totalReturns);
  const cashVisaTotal = totals.cash + totals.visa;
  const commissionOnCashVisa = cashVisaTotal * (commissionPct / 100);
  const commissionOnCL = totals.cl * (commissionPct / 100);
  const commissionOnHospitality = totals.hospitality * (commissionPct / 100);
  const netHospitality = totals.hospitality - commissionOnHospitality;
  const totalCommission = commissionOnCashVisa + commissionOnCL + commissionOnHospitality;

  return {
    key, name, commissionPct,
    totals, grandTotal, paymentsTotal, netSales,
    totalSubtotal, totalDiscount, totalReturns,
    totalOtherAdjustments, totalMinCharge,
    totalTax, totalService, totalDeliveryFee,
    commissionOnCashVisa, commissionOnCL,
    commissionOnHospitality, netHospitality,
    totalCommission,
    orders: groupOrders
  };
};

const SummaryGrid = ({ s, color }) => (
  <div className={`px-4 py-3 rounded-lg border ${color}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-4 h-4" />
        <span className="font-semibold text-sm">{s.name}</span>
        <Badge variant="outline" className="text-xs">{s.orders.length} orders</Badge>
      </div>
      <span className="font-bold text-sm">Total Sales: {formatCurrency(s.paymentsTotal)}</span>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {[
        { label: 'Total Sales', value: s.paymentsTotal },
        { label: 'Total Discounts', value: s.totalDiscount },
        { label: 'Offers / Manual Adj.', value: s.totalOtherAdjustments },
        { label: 'Total Returns', value: s.totalReturns || 0 },
        { label: 'Net Sales', value: s.netSales },
        { label: 'Total Commission', value: s.totalCommission },
        { label: 'Tax', value: s.totalTax },
        { label: 'Service Charge', value: s.totalService },
        { label: 'Delivery Fees', value: s.totalDeliveryFee },
        { label: 'Cash', value: s.totals.cash },
        { label: 'Visa', value: s.totals.visa },
        { label: 'CL', value: s.totals.cl },
        { label: 'Hospitality', value: s.totals.hospitality },
        { label: 'Instapay', value: s.totals.instapay },
      ].map(({ label, value }) => (
        <div key={label} className="bg-white/60 rounded-md p-2 border border-white/80">
          <div className="text-xs opacity-70 mb-0.5">{label}</div>
          <div className="font-bold text-sm">{formatCurrency(value)}</div>
        </div>
      ))}
    </div>
  </div>
);

const GroupCard = ({ s, expandedKey, setExpandedKey }) => {
  const isExpanded = expandedKey === s.key;
  return (
    <Card className="overflow-hidden ml-2">
      <CardHeader
        className="cursor-pointer hover:bg-slate-50 transition-colors pb-3"
        onClick={() => setExpandedKey(isExpanded ? null : s.key)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            <CardTitle className="text-base">{s.name}</CardTitle>
            <Badge variant="outline" className="text-xs">{s.orders.length} order{s.orders.length !== 1 ? 's' : ''}</Badge>
            {s.commissionPct > 0 && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{s.commissionPct}% commission</Badge>
            )}
          </div>
          <div className="text-right">
            <div className="font-bold text-slate-900">{formatCurrency(s.paymentsTotal)}</div>
            <div className="text-xs text-slate-500">Total Sales</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="rounded-lg border bg-slate-50 border-slate-200 p-3">
            <div className="text-xs font-medium text-slate-500 mb-1">Total Sales (payments)</div>
            <div className="font-bold text-slate-900">{formatCurrency(s.paymentsTotal)}</div>
          </div>
          <div className="rounded-lg border bg-yellow-50 border-yellow-200 p-3">
            <div className="text-xs font-medium text-yellow-700 mb-1">Total Discount</div>
            <div className="font-bold text-yellow-800">{formatCurrency(s.totalDiscount)}</div>
          </div>
          <div className="rounded-lg border bg-red-50 border-red-200 p-3">
            <div className="text-xs font-medium text-red-700 mb-1">Total Returns</div>
            <div className="font-bold text-red-800">{formatCurrency(s.totalReturns)}</div>
          </div>
          <div className="rounded-lg border bg-emerald-50 border-emerald-200 p-3">
            <div className="text-xs font-medium text-emerald-700 mb-1">Net Sales</div>
            <div className="font-bold text-emerald-800">{formatCurrency(s.netSales)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Cash', value: s.totals.cash, color: 'bg-green-50 border-green-200 text-green-800' },
            { label: 'Visa', value: s.totals.visa, color: 'bg-blue-50 border-blue-200 text-blue-800' },
            { label: 'CL', value: s.totals.cl, color: 'bg-purple-50 border-purple-200 text-purple-800' },
            { label: 'Hospitality', value: s.totals.hospitality, color: 'bg-rose-50 border-rose-200 text-rose-800' },
            { label: 'Instapay', value: s.totals.instapay, color: 'bg-teal-50 border-teal-200 text-teal-800' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-lg border p-3 ${color}`}>
              <div className="text-xs font-medium mb-1">{label}</div>
              <div className="font-bold text-sm">{formatCurrency(value)}</div>
            </div>
          ))}
        </div>

        {s.commissionPct > 0 && (
          <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 mb-4 space-y-1.5 text-sm">
            <p className="font-semibold text-amber-900 mb-2">Commission Summary ({s.commissionPct}%)</p>
            {s.totals.cash + s.totals.visa > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>Cash + Visa commission</span>
                <span className="font-semibold text-red-700">- {formatCurrency(s.commissionOnCashVisa)}</span>
              </div>
            )}
            {s.totals.cl > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>CL commission</span>
                <span className="font-semibold text-orange-700">- {formatCurrency(s.commissionOnCL)}</span>
              </div>
            )}
            {s.totals.hospitality > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>Hospitality commission (net: {formatCurrency(s.netHospitality)})</span>
                <span className="font-semibold text-slate-700">- {formatCurrency(s.commissionOnHospitality)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-amber-300 pt-1.5 text-amber-900">
              <span>Total Commission</span>
              <span>{formatCurrency(s.totalCommission)}</span>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.orders.map(o => {
                  const commission = (o.total || 0) * (s.commissionPct / 100);
                  const cat = (o.payment_method || 'other').replace(/_/g, ' ');
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(o.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{o.customer_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {(o.order_type || '').replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{cat}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(o.total)}</TableCell>
                      <TableCell className="text-right text-sm text-slate-500">
                        {s.commissionPct > 0 ? formatCurrency(commission) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function AllSalesFinancials({ startDate, endDate }) {
  const [expandedKey, setExpandedKey] = useState(null);
  const { selectedBranchId } = useBranch();

  const { data: orders = [] } = useQuery({
    queryKey: ["allSalesOrders", startDate, endDate],
    queryFn: () => base44.entities.Order.list("-created_date", 10000)
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.entities.DeliveryCompany.list("name")
  });

  const { data: returns = [] } = useQuery({
    queryKey: ["allSalesReturns"],
    queryFn: () => base44.entities.Return.list("-created_date", 10000)
  });

  const returnsByOrder = returns.reduce((acc, r) => {
    if (r.status === 'cancelled') return acc;
    if (!r.order_id) return acc;
    acc[r.order_id] = (acc[r.order_id] || 0) + (r.refund_amount || 0);
    return acc;
  }, {});

  // All paid/completed orders in date range (include legacy data with no branch_id)
  const filteredOrders = orders.filter(o => {
    if (!o.created_date) return false;
    if (!['paid', 'completed'].includes(o.status)) return false;
    if (selectedBranchId && o.branch_id && o.branch_id !== selectedBranchId) return false;
    const d = companyDateOf(o.created_date);
    return d >= startDate && d <= endDate;
  });

  // Group: Dine In, Takeaway, and per delivery company
  const dineInOrders = filteredOrders.filter(o => o.order_type === 'dine_in');
  const takeawayOrders = filteredOrders.filter(o => o.order_type === 'takeaway');
  const deliveryOrders = filteredOrders.filter(o => o.order_type === 'delivery');

  const byCompany = deliveryOrders.reduce((acc, o) => {
    const key = o.delivery_company_id || o.delivery_company_name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  const dineInSummary = dineInOrders.length > 0 ? buildSummary('dine_in', 'Dine In', dineInOrders, 0, returnsByOrder) : null;
  const takeawaySummary = takeawayOrders.length > 0 ? buildSummary('takeaway', 'Takeaway', takeawayOrders, 0, returnsByOrder) : null;
  const companySummaries = Object.entries(byCompany).map(([key, ords]) => {
    const company = companies.find(c => c.id === key || c.name === key);
    return buildSummary(key, company?.name || key, ords, company?.commission_percentage || 0, returnsByOrder);
  });

  const allSummaries = [
    ...(dineInSummary ? [dineInSummary] : []),
    ...(takeawaySummary ? [takeawaySummary] : []),
    ...companySummaries
  ];

  // Overall totals
  const overall = buildSummary('overall', 'All Sales', filteredOrders, 0, returnsByOrder);

  if (allSummaries.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No orders found for selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall banner */}
      <SummaryGrid s={overall} color="bg-slate-100 border-slate-300 text-slate-800" />

      {/* Per category cards */}
      <div className="space-y-3">
        {allSummaries.map(s => (
          <GroupCard key={s.key} s={s} expandedKey={expandedKey} setExpandedKey={setExpandedKey} />
        ))}
      </div>
    </div>
  );
}