import { useState } from "react";
import { companyDateOf } from "@/components/utils/timezoneHelper";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { Truck, ChevronDown, ChevronRight } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";

export default function DeliveryCompanyFinancials({ startDate, endDate }) {
  const [expandedCompany, setExpandedCompany] = useState(null);
  const { selectedBranchId } = useBranch();

  const { data: orders = [] } = useQuery({
    queryKey: ["deliveryCompanyOrders", startDate, endDate],
    queryFn: () => base44.entities.Order.list()
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.entities.DeliveryCompany.list("name")
  });

  // Filter delivery orders in date range (paid or completed, include legacy data)
  const deliveryOrders = orders.filter(o => {
    if (!o.created_date) return false;
    if (!['paid', 'completed'].includes(o.status)) return false;
    if (o.order_type !== 'delivery') return false;
    if (!o.delivery_company_id && !o.delivery_company_name) return false;
    if (selectedBranchId && o.branch_id && o.branch_id !== selectedBranchId) return false;
    const d = companyDateOf(o.created_date);
    return d >= startDate && d <= endDate;
  });

  // Group by delivery company
  const byCompany = deliveryOrders.reduce((acc, o) => {
    const companyId = o.delivery_company_id || o.delivery_company_name || 'unknown';
    if (!acc[companyId]) acc[companyId] = [];
    acc[companyId].push(o);
    return acc;
  }, {});

  const PAYMENT_METHODS = {
    cash: ['cash'],
    visa: ['visa', 'visa_cash', 'visa_instapay'],
    cl: ['cl'],
    hospitality: ['hospitality'],
    instapay: ['instapay']
  };

  const categorizePayment = (method) => {
    if (!method) return 'other';
    for (const [cat, methods] of Object.entries(PAYMENT_METHODS)) {
      if (methods.includes(method)) return cat;
    }
    return 'other';
  };

  const buildCompanySummary = (companyId, orders) => {
    const company = companies.find(c => c.id === companyId || c.name === companyId);
    const name = company?.name || companyId;
    const commissionPct = company?.commission_percentage || 0;

    const totals = { cash: 0, visa: 0, cl: 0, hospitality: 0, instapay: 0, other: 0 };
    let totalSubtotal = 0;
    let totalDiscount = 0;
    orders.forEach(o => {
      const cat = categorizePayment(o.payment_method);
      totals[cat] += o.total || 0;
      totalSubtotal += (o.subtotal || o.total || 0);
      totalDiscount += o.discount_amount || 0;
    });

    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

    // Commission logic:
    // Cash + Visa: commission owed by restaurant to delivery company
    // CL: commission to be paid BACK to delivery company (they paid full price, we owe them commission)
    // Hospitality: commission deducted FROM hospitality total (restaurant absorbs it)
    const cashVisaTotal = totals.cash + totals.visa;
    const commissionOnCashVisa = cashVisaTotal * (commissionPct / 100);
    const commissionOnCL = totals.cl * (commissionPct / 100);
    const commissionOnHospitality = totals.hospitality * (commissionPct / 100);
    const netHospitality = totals.hospitality - commissionOnHospitality;

    return {
      companyId, name, company, commissionPct,
      totals, grandTotal,
      totalSubtotal, totalDiscount,
      commissionOnCashVisa, commissionOnCL,
      commissionOnHospitality, netHospitality,
      orders,
      totalCommission: commissionOnCashVisa + commissionOnCL + commissionOnHospitality
    };
  };

  const summaries = Object.entries(byCompany).map(([id, ords]) => buildCompanySummary(id, ords));

  // Group summaries by direct / indirect
  const directSummaries = summaries.filter(s => (s.company?.delivery_type || 'indirect') === 'direct');
  const indirectSummaries = summaries.filter(s => (s.company?.delivery_type || 'indirect') === 'indirect');

  if (summaries.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No delivery company orders found for selected period.</p>
      </div>
    );
  }

  const renderGroup = (groupSummaries, groupLabel, groupColor) => {
    if (groupSummaries.length === 0) return null;
    const groupTotal = groupSummaries.reduce((sum, s) => sum + s.grandTotal, 0);
    const groupSales = groupSummaries.reduce((sum, s) => sum + s.totalSubtotal, 0);
    const groupDiscount = groupSummaries.reduce((sum, s) => sum + s.totalDiscount, 0);
    const groupCommission = groupSummaries.reduce((sum, s) => sum + s.totalCommission, 0);
    const groupCash = groupSummaries.reduce((sum, s) => sum + s.totals.cash, 0);
    const groupVisa = groupSummaries.reduce((sum, s) => sum + s.totals.visa, 0);
    const groupCL = groupSummaries.reduce((sum, s) => sum + s.totals.cl, 0);
    const groupHospitality = groupSummaries.reduce((sum, s) => sum + s.totals.hospitality, 0);
    const groupInstapay = groupSummaries.reduce((sum, s) => sum + s.totals.instapay, 0);
    return (
      <div key={groupLabel} className="space-y-3">
        <div className={`px-4 py-3 rounded-lg border ${groupColor}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span className="font-semibold text-sm">{groupLabel} Delivery Companies</span>
              <Badge variant="outline" className="text-xs">{groupSummaries.length} compan{groupSummaries.length !== 1 ? 'ies' : 'y'}</Badge>
            </div>
            <span className="font-bold text-sm">Total: {formatCurrency(groupTotal)}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-white/60 rounded-md p-2 border border-white/80">
              <div className="text-xs opacity-70 mb-0.5">Total Sales</div>
              <div className="font-bold text-sm">{formatCurrency(groupSales)}</div>
            </div>
            <div className="bg-white/60 rounded-md p-2 border border-white/80">
              <div className="text-xs opacity-70 mb-0.5">Total Discounts</div>
              <div className="font-bold text-sm">{formatCurrency(groupDiscount)}</div>
            </div>
            <div className="bg-white/60 rounded-md p-2 border border-white/80">
              <div className="text-xs opacity-70 mb-0.5">Total Commission</div>
              <div className="font-bold text-sm">{formatCurrency(groupCommission)}</div>
            </div>
            <div className="bg-white/60 rounded-md p-2 border border-white/80">
              <div className="text-xs opacity-70 mb-0.5">Cash</div>
              <div className="font-bold text-sm">{formatCurrency(groupCash)}</div>
            </div>
            <div className="bg-white/60 rounded-md p-2 border border-white/80">
              <div className="text-xs opacity-70 mb-0.5">Visa</div>
              <div className="font-bold text-sm">{formatCurrency(groupVisa)}</div>
            </div>
            <div className="bg-white/60 rounded-md p-2 border border-white/80">
              <div className="text-xs opacity-70 mb-0.5">CL</div>
              <div className="font-bold text-sm">{formatCurrency(groupCL)}</div>
            </div>
            <div className="bg-white/60 rounded-md p-2 border border-white/80">
              <div className="text-xs opacity-70 mb-0.5">Hospitality</div>
              <div className="font-bold text-sm">{formatCurrency(groupHospitality)}</div>
            </div>
            <div className="bg-white/60 rounded-md p-2 border border-white/80">
              <div className="text-xs opacity-70 mb-0.5">Instapay</div>
              <div className="font-bold text-sm">{formatCurrency(groupInstapay)}</div>
            </div>
          </div>
        </div>
        {groupSummaries.map((s) => (
          <Card key={s.companyId} className="overflow-hidden ml-2">
            <CardHeader
              className="cursor-pointer hover:bg-slate-50 transition-colors pb-3"
              onClick={() => setExpandedCompany(expandedCompany === s.companyId ? null : s.companyId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedCompany === s.companyId
                    ? <ChevronDown className="w-4 h-4 text-slate-500" />
                    : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: s.company?.color || '#94a3b8' }}
                  />
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {s.orders.length} order{s.orders.length !== 1 ? 's' : ''}
                  </Badge>
                  {s.commissionPct > 0 && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                      {s.commissionPct}% commission
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{formatCurrency(s.grandTotal)}</div>
                  <div className="text-xs text-slate-500">Grand Total</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-lg border bg-slate-50 border-slate-200 p-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Total Sales (before discount)</div>
                  <div className="font-bold text-slate-900">{formatCurrency(s.totalSubtotal)}</div>
                </div>
                <div className="rounded-lg border bg-yellow-50 border-yellow-200 p-3">
                  <div className="text-xs font-medium text-yellow-700 mb-1">Total Discount</div>
                  <div className="font-bold text-yellow-800">{formatCurrency(s.totalDiscount)}</div>
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
                      <span>Cash + Visa commission (owed to {s.name})</span>
                      <span className="font-semibold text-red-700">- {formatCurrency(s.commissionOnCashVisa)}</span>
                    </div>
                  )}
                  {s.totals.cl > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>CL commission (to pay back to {s.name})</span>
                      <span className="font-semibold text-orange-700">- {formatCurrency(s.commissionOnCL)}</span>
                    </div>
                  )}
                  {s.totals.hospitality > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>Hospitality commission deducted (net: {formatCurrency(s.netHospitality)})</span>
                      <span className="font-semibold text-slate-700">- {formatCurrency(s.commissionOnHospitality)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-amber-300 pt-1.5 text-amber-900">
                    <span>Total Commission</span>
                    <span>{formatCurrency(s.totalCommission)}</span>
                  </div>
                </div>
              )}

              {expandedCompany === s.companyId && (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.orders.map(o => {
                        const commission = (o.total || 0) * (s.commissionPct / 100);
                        const cat = categorizePayment(o.payment_method);
                        return (
                          <TableRow key={o.id}>
                            <TableCell className="text-xs text-slate-500">
                              {new Date(o.created_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm">{o.customer_name || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {cat}
                              </Badge>
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
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderGroup(directSummaries, 'Direct', 'bg-blue-50 border-blue-200 text-blue-800')}
      {renderGroup(indirectSummaries, 'Indirect', 'bg-orange-50 border-orange-200 text-orange-800')}
    </div>
  );
}