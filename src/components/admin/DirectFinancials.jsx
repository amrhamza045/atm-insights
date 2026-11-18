import { useState } from "react";
import { companyDateOf } from "@/components/utils/timezoneHelper";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { UtensilsCrossed, Truck, ChevronDown, ChevronRight } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";

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

const buildGroupSummary = (groupKey, groupName, groupOrders, commissionPct = 0) => {
  const totals = { cash: 0, visa: 0, cl: 0, hospitality: 0, instapay: 0, other: 0 };
  let totalSubtotal = 0;
  let totalDiscount = 0;

  groupOrders.forEach(o => {
    const cat = categorizePayment(o.payment_method);
    totals[cat] += o.total || 0;
    totalSubtotal += (o.subtotal || o.total || 0);
    totalDiscount += o.discount_amount || 0;
  });

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
  const cashVisaTotal = totals.cash + totals.visa;
  const commissionOnCashVisa = cashVisaTotal * (commissionPct / 100);
  const commissionOnCL = totals.cl * (commissionPct / 100);
  const commissionOnHospitality = totals.hospitality * (commissionPct / 100);
  const netHospitality = totals.hospitality - commissionOnHospitality;
  const totalCommission = commissionOnCashVisa + commissionOnCL + commissionOnHospitality;

  return {
    groupKey, groupName, commissionPct,
    totals, grandTotal,
    totalSubtotal, totalDiscount,
    commissionOnCashVisa, commissionOnCL,
    commissionOnHospitality, netHospitality,
    totalCommission,
    orders: groupOrders
  };
};

const SummaryBanner = ({ summaries, bannerLabel, bannerColor, icon: Icon }) => {
  const groupTotal = summaries.reduce((sum, s) => sum + s.grandTotal, 0);
  const groupSales = summaries.reduce((sum, s) => sum + s.totalSubtotal, 0);
  const groupDiscount = summaries.reduce((sum, s) => sum + s.totalDiscount, 0);
  const groupCommission = summaries.reduce((sum, s) => sum + s.totalCommission, 0);
  const groupCash = summaries.reduce((sum, s) => sum + s.totals.cash, 0);
  const groupVisa = summaries.reduce((sum, s) => sum + s.totals.visa, 0);
  const groupCL = summaries.reduce((sum, s) => sum + s.totals.cl, 0);
  const groupHospitality = summaries.reduce((sum, s) => sum + s.totals.hospitality, 0);
  const groupInstapay = summaries.reduce((sum, s) => sum + s.totals.instapay, 0);

  return (
    <div className={`px-4 py-3 rounded-lg border ${bannerColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-semibold text-sm">{bannerLabel}</span>
          <Badge variant="outline" className="text-xs">{summaries.length} category{summaries.length !== 1 ? 's' : ''}</Badge>
        </div>
        <span className="font-bold text-sm">Total: {formatCurrency(groupTotal)}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Total Sales', value: groupSales },
          { label: 'Total Discounts', value: groupDiscount },
          { label: 'Total Commission', value: groupCommission },
          { label: 'Cash', value: groupCash },
          { label: 'Visa', value: groupVisa },
          { label: 'CL', value: groupCL },
          { label: 'Hospitality', value: groupHospitality },
          { label: 'Instapay', value: groupInstapay },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/60 rounded-md p-2 border border-white/80">
            <div className="text-xs opacity-70 mb-0.5">{label}</div>
            <div className="font-bold text-sm">{formatCurrency(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const GroupCard = ({ s, expandedKey, setExpandedKey }) => {
  const isExpanded = expandedKey === s.groupKey;
  return (
    <Card className="overflow-hidden ml-2">
      <CardHeader
        className="cursor-pointer hover:bg-slate-50 transition-colors pb-3"
        onClick={() => setExpandedKey(isExpanded ? null : s.groupKey)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            <CardTitle className="text-base">{s.groupName}</CardTitle>
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

export default function DirectFinancials({ startDate, endDate }) {
  const [expandedKey, setExpandedKey] = useState(null);
  const { selectedBranchId } = useBranch();

  const { data: orders = [] } = useQuery({
    queryKey: ["directFinancialOrders", startDate, endDate],
    queryFn: () => base44.entities.Order.list()
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.entities.DeliveryCompany.list("name")
  });

  const directCompanies = companies.filter(c => (c.delivery_type || 'indirect') === 'direct');
  const directCompanyIds = new Set(directCompanies.map(c => c.id));
  const directCompanyNames = new Set(directCompanies.map(c => c.name));

  // Filter: paid/completed orders in date range that are either dine_in, takeaway, OR direct delivery (include legacy data)
  const filteredOrders = orders.filter(o => {
    if (!o.created_date) return false;
    if (!['paid', 'completed'].includes(o.status)) return false;
    if (selectedBranchId && o.branch_id && o.branch_id !== selectedBranchId) return false;
    const d = companyDateOf(o.created_date);
    if (d < startDate || d > endDate) return false;

    if (o.order_type === 'dine_in') return true;
    if (o.order_type === 'takeaway') return true;
    if (o.order_type === 'delivery') {
      const cId = o.delivery_company_id;
      const cName = o.delivery_company_name;
      return (cId && directCompanyIds.has(cId)) || (cName && directCompanyNames.has(cName));
    }
    return false;
  });

  // Build summaries grouped by type
  const dineInOrders = filteredOrders.filter(o => o.order_type === 'dine_in');
  const takeawayOrders = filteredOrders.filter(o => o.order_type === 'takeaway');

  // Group delivery orders by direct company
  const byDirectCompany = filteredOrders
    .filter(o => o.order_type === 'delivery')
    .reduce((acc, o) => {
      const key = o.delivery_company_id || o.delivery_company_name || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(o);
      return acc;
    }, {});

  const dineInSummary = dineInOrders.length > 0
    ? [buildGroupSummary('dine_in', 'Dine In', dineInOrders, 0)]
    : [];
  const takeawaySummary = takeawayOrders.length > 0
    ? [buildGroupSummary('takeaway', 'Takeaway', takeawayOrders, 0)]
    : [];

  const deliverySummaries = Object.entries(byDirectCompany).map(([key, ords]) => {
    const company = directCompanies.find(c => c.id === key || c.name === key);
    const name = company?.name || key;
    const commissionPct = company?.commission_percentage || 0;
    return buildGroupSummary(key, name, ords, commissionPct);
  });

  const allSummaries = [...dineInSummary, ...takeawaySummary, ...deliverySummaries];

  if (allSummaries.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No Dine In or Direct delivery orders found for selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall summary banner */}
      <SummaryBanner
        summaries={allSummaries}
        bannerLabel="Direct Sales (Dine In + Takeaway + Direct Delivery)"
        bannerColor="bg-blue-50 border-blue-200 text-blue-800"
        icon={UtensilsCrossed}
      />

      {/* Dine In group */}
      {dineInSummary.length > 0 && (
        <div className="space-y-3">
          <SummaryBanner
            summaries={dineInSummary}
            bannerLabel="Dine In"
            bannerColor="bg-emerald-50 border-emerald-200 text-emerald-800"
            icon={UtensilsCrossed}
          />
          {dineInSummary.map(s => (
            <GroupCard key={s.groupKey} s={s} expandedKey={expandedKey} setExpandedKey={setExpandedKey} />
          ))}
        </div>
      )}

      {/* Takeaway group */}
      {takeawaySummary.length > 0 && (
        <div className="space-y-3">
          <SummaryBanner
            summaries={takeawaySummary}
            bannerLabel="Takeaway"
            bannerColor="bg-amber-50 border-amber-200 text-amber-800"
            icon={UtensilsCrossed}
          />
          {takeawaySummary.map(s => (
            <GroupCard key={s.groupKey} s={s} expandedKey={expandedKey} setExpandedKey={setExpandedKey} />
          ))}
        </div>
      )}

      {/* Direct Delivery group */}
      {deliverySummaries.length > 0 && (
        <div className="space-y-3">
          <div className="bg-sky-50 border border-sky-200 text-sky-800 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4" />
              <span className="font-semibold text-sm">Direct Delivery</span>
            </div>
            <SummaryBanner
              summaries={deliverySummaries}
              bannerLabel="Direct Delivery Summary"
              bannerColor="bg-sky-50 border-sky-100 text-sky-800"
              icon={Truck}
            />
          </div>
          {deliverySummaries.map(s => (
            <GroupCard key={s.groupKey} s={s} expandedKey={expandedKey} setExpandedKey={setExpandedKey} />
          ))}
        </div>
      )}
    </div>
  );
}