import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getTimezoneOffset } from "@/components/utils/timezoneHelper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { FileText, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useBranch } from "@/components/branches/BranchContext";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const fmt = (n) => formatCurrency(n || 0);

const PAYMENT_METHODS = {
  cash: ['cash'],
  visa: ['visa', 'visa_cash', 'visa_instapay'],
  cl: ['cl'],
  hospitality: ['hospitality'],
  instapay: ['instapay'],
};

const categorizePayment = (method) => {
  if (!method) return 'other';
  for (const [cat, methods] of Object.entries(PAYMENT_METHODS)) {
    if (methods.includes(method)) return cat;
  }
  return 'other';
};

const buildDayData = (dayOrders, companies) => {
  const dineIn = dayOrders.filter(o => o.order_type === 'dine_in');
  const takeaway = dayOrders.filter(o => o.order_type === 'takeaway');
  const delivery = dayOrders.filter(o => o.order_type === 'delivery');

  const calcTotals = (orders, commissionPct = 0) => {
    const totals = { cash: 0, visa: 0, cl: 0, hospitality: 0, instapay: 0, other: 0 };
    let subtotal = 0, discount = 0;
    orders.forEach(o => {
      totals[categorizePayment(o.payment_method)] += o.total || 0;
      subtotal += o.subtotal || o.total || 0;
      discount += o.discount_amount || 0;
    });
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    const commission = grandTotal * (commissionPct / 100);
    return { totals, subtotal, discount, grandTotal, commission, commissionPct, count: orders.length };
  };

  // Delivery by company
  const byCompany = delivery.reduce((acc, o) => {
    const key = o.delivery_company_id || o.delivery_company_name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(o);
    return acc;
  }, {});

  const deliveryCompanies = Object.entries(byCompany).map(([key, ords]) => {
    const co = companies.find(c => c.id === key || c.name === key);
    return { name: co?.name || key, ...calcTotals(ords, co?.commission_percentage || 0) };
  });

  return {
    dineIn: calcTotals(dineIn),
    takeaway: calcTotals(takeaway),
    delivery: calcTotals(delivery),
    deliveryCompanies,
    all: calcTotals(dayOrders),
  };
};

const TotalsRow = ({ label, data, highlight = false }) => (
  <TableRow className={highlight ? "bg-slate-50 font-semibold" : ""}>
    <TableCell className="font-medium text-sm">{label}</TableCell>
    <TableCell className="text-center text-sm">{data.count}</TableCell>
    <TableCell className="text-right text-sm">{fmt(data.subtotal)}</TableCell>
    <TableCell className="text-right text-sm text-red-600">{data.discount > 0 ? `- ${fmt(data.discount)}` : '—'}</TableCell>
    <TableCell className="text-right text-sm">{fmt(data.totals.cash)}</TableCell>
    <TableCell className="text-right text-sm">{fmt(data.totals.visa)}</TableCell>
    <TableCell className="text-right text-sm">{fmt(data.totals.instapay)}</TableCell>
    <TableCell className="text-right text-sm">{fmt(data.totals.cl)}</TableCell>
    <TableCell className="text-right text-sm">{fmt(data.totals.hospitality)}</TableCell>
    {data.commissionPct > 0 ? (
      <TableCell className="text-right text-sm text-orange-600">- {fmt(data.commission)}</TableCell>
    ) : (
      <TableCell className="text-right text-sm text-slate-400">—</TableCell>
    )}
    <TableCell className="text-right font-bold text-sm">{fmt(data.grandTotal)}</TableCell>
  </TableRow>
);

const DayCard = ({ date, data }) => (
  <Card className="overflow-hidden">
    <CardHeader className="bg-slate-50 pb-3 pt-4 px-4">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base font-bold text-slate-800">{date}</CardTitle>
        <div className="flex gap-3 text-sm">
          <span className="text-slate-500">{data.all.count} orders</span>
          <span className="font-bold text-slate-900">{fmt(data.all.grandTotal)}</span>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100">
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs text-center">Orders</TableHead>
              <TableHead className="text-xs text-right">Subtotal</TableHead>
              <TableHead className="text-xs text-right">Discount</TableHead>
              <TableHead className="text-xs text-right">Cash</TableHead>
              <TableHead className="text-xs text-right">Visa</TableHead>
              <TableHead className="text-xs text-right">Instapay</TableHead>
              <TableHead className="text-xs text-right">CL</TableHead>
              <TableHead className="text-xs text-right">Hospitality</TableHead>
              <TableHead className="text-xs text-right">Commission</TableHead>
              <TableHead className="text-xs text-right">Net Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.dineIn.count > 0 && <TotalsRow label="🍽 Dine In" data={data.dineIn} />}
            {data.takeaway.count > 0 && <TotalsRow label="🥡 Takeaway" data={data.takeaway} />}
            {data.deliveryCompanies.map(co => (
              <TotalsRow key={co.name} label={`🛵 ${co.name}`} data={co} />
            ))}
            {data.delivery.count > 0 && data.deliveryCompanies.length === 0 && (
              <TotalsRow label="🛵 Delivery" data={data.delivery} />
            )}
            <TotalsRow label="TOTAL" data={data.all} highlight />
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

// ── Export helpers ──────────────────────────────────────────────────────────

const buildReportHtml = (reportData, startDate, endDate) => {
  const tableStyle = `border-collapse:collapse;width:100%;font-size:11px;`;
  const thStyle = `border:1px solid #ccc;padding:5px 8px;background:#f1f5f9;text-align:right;white-space:nowrap;`;
  const tdStyle = `border:1px solid #e2e8f0;padding:5px 8px;text-align:right;white-space:nowrap;`;
  const tdLStyle = `border:1px solid #e2e8f0;padding:5px 8px;text-align:left;white-space:nowrap;`;
  const totalStyle = `border:1px solid #ccc;padding:5px 8px;text-align:right;font-weight:bold;background:#f8fafc;`;

  const f = (v) => (v || 0).toFixed(2);

  let html = `
    <html><head><meta charset="UTF-8">
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#1e293b;}
    h1{color:#1e293b;font-size:18px;margin-bottom:4px;}
    h2{color:#334155;font-size:14px;margin:18px 0 6px;}
    p{color:#64748b;font-size:11px;margin:0 0 16px;}
    .day-block{margin-bottom:24px;page-break-inside:avoid;}
    </style></head><body>
    <h1>Daily Sales Report</h1>
    <p>Period: ${startDate} to ${endDate}</p>
  `;

  for (const { date, data } of reportData) {
    html += `<div class="day-block">
      <h2>${date} &nbsp;—&nbsp; ${data.all.count} orders &nbsp;|&nbsp; Total: ${f(data.all.grandTotal)} EGP</h2>
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle.replace('text-align:right','text-align:left')}">Category</th>
          <th style="${thStyle}">Orders</th>
          <th style="${thStyle}">Subtotal</th>
          <th style="${thStyle}">Discount</th>
          <th style="${thStyle}">Cash</th>
          <th style="${thStyle}">Visa</th>
          <th style="${thStyle}">Instapay</th>
          <th style="${thStyle}">CL</th>
          <th style="${thStyle}">Hospitality</th>
          <th style="${thStyle}">Commission</th>
          <th style="${thStyle}">Net Total</th>
        </tr></thead>
        <tbody>
    `;

    const addRow = (label, d, bold = false) => {
      const s = bold ? totalStyle : tdStyle;
      const sl = bold ? totalStyle.replace('text-align:right', 'text-align:left') : tdLStyle;
      html += `<tr>
        <td style="${sl}">${label}</td>
        <td style="${s}">${d.count}</td>
        <td style="${s}">${f(d.subtotal)}</td>
        <td style="${s}">${d.discount > 0 ? `- ${f(d.discount)}` : '—'}</td>
        <td style="${s}">${f(d.totals.cash)}</td>
        <td style="${s}">${f(d.totals.visa)}</td>
        <td style="${s}">${f(d.totals.instapay)}</td>
        <td style="${s}">${f(d.totals.cl)}</td>
        <td style="${s}">${f(d.totals.hospitality)}</td>
        <td style="${s}">${d.commission > 0 ? `- ${f(d.commission)}` : '—'}</td>
        <td style="${s}">${f(d.grandTotal)}</td>
      </tr>`;
    };

    if (data.dineIn.count > 0) addRow('Dine In', data.dineIn);
    if (data.takeaway.count > 0) addRow('Takeaway', data.takeaway);
    data.deliveryCompanies.forEach(co => addRow(co.name, co));
    if (data.delivery.count > 0 && data.deliveryCompanies.length === 0) addRow('Delivery', data.delivery);
    addRow('TOTAL', data.all, true);

    html += `</tbody></table></div>`;
  }

  html += `</body></html>`;
  return html;
};

const exportToWord = (reportData, startDate, endDate) => {
  const html = buildReportHtml(reportData, startDate, endDate);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `daily-sales-report-${startDate}-to-${endDate}.doc`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToPdf = (reportData, startDate, endDate) => {
  const html = buildReportHtml(reportData, startDate, endDate);
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
};

const exportToExcel = (reportData, startDate, endDate) => {
  const wb = XLSX.utils.book_new();
  const f = (v) => (v || 0).toFixed(2);

  reportData.forEach(({ date, data }, idx) => {
    const rows = [
      [date, '', '', '', '', '', '', '', '', '', ''],
      ['Category', 'Orders', 'Subtotal', 'Discount', 'Cash', 'Visa', 'Instapay', 'CL', 'Hospitality', 'Commission', 'Net Total'],
    ];

    const addRow = (label, d) => {
      rows.push([
        label,
        d.count,
        f(d.subtotal),
        d.discount > 0 ? `- ${f(d.discount)}` : '—',
        f(d.totals.cash),
        f(d.totals.visa),
        f(d.totals.instapay),
        f(d.totals.cl),
        f(d.totals.hospitality),
        d.commission > 0 ? `- ${f(d.commission)}` : '—',
        f(d.grandTotal),
      ]);
    };

    if (data.dineIn.count > 0) addRow('Dine In', data.dineIn);
    if (data.takeaway.count > 0) addRow('Takeaway', data.takeaway);
    data.deliveryCompanies.forEach(co => addRow(co.name, co));
    if (data.delivery.count > 0 && data.deliveryCompanies.length === 0) addRow('Delivery', data.delivery);
    addRow('TOTAL', data.all);

    rows.push([]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, date);
  });

  XLSX.writeFile(wb, `daily-sales-report-${startDate}-to-${endDate}.xlsx`);
};

// ── Main component ──────────────────────────────────────────────────────────

export default function DailySalesReport({ startDate, endDate }) {
  const { selectedBranchId } = useBranch();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["dailySalesOrders", startDate, endDate],
    queryFn: () => base44.entities.Order.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["deliveryCompaniesReport"],
    queryFn: () => base44.entities.DeliveryCompany.list("name"),
  });

  const reportData = useMemo(() => {
    const filtered = orders.filter(o => {
      if (!o.created_date) return false;
      if (!['paid', 'completed'].includes(o.status)) return false;
      if (selectedBranchId && o.branch_id && o.branch_id !== selectedBranchId) return false;
      const d = new Date(new Date(o.created_date).getTime() + getTimezoneOffset()).toISOString().split('T')[0];
      return d >= startDate && d <= endDate;
    });

    // Group by date
    const byDate = filtered.reduce((acc, o) => {
      const d = new Date(new Date(o.created_date).getTime() + getTimezoneOffset()).toISOString().split('T')[0];
      if (!acc[d]) acc[d] = [];
      acc[d].push(o);
      return acc;
    }, {});

    return Object.keys(byDate)
      .sort((a, b) => a.localeCompare(b))
      .map(date => ({
        date,
        data: buildDayData(byDate[date], companies),
      }));
  }, [orders, companies, startDate, endDate]);

  // Build chart data by category over time (must be before early returns)
  const chartData = useMemo(() => {
    if (reportData.length === 0) return [];
    return reportData.map(({ date, data }) => ({
      date: date.slice(5), // MM-DD format
      'All Sales': data.all.grandTotal,
      'Dine In': data.dineIn.grandTotal,
      'Takeaway': data.takeaway.grandTotal,
      'All Delivery': data.delivery.grandTotal,
      ...Object.fromEntries(data.deliveryCompanies.map(co => [co.name, co.grandTotal]))
    }));
  }, [reportData]);

  // Build summary by category (must be before early returns)
  const categorySummary = useMemo(() => {
    if (reportData.length === 0) return [];
    const summary = {
      'Dine In': 0,
      'Takeaway': 0,
      'All Delivery': 0,
    };
    const deliveryByCompany = {};

    reportData.forEach(({ data }) => {
      summary['Dine In'] += data.dineIn.grandTotal;
      summary['Takeaway'] += data.takeaway.grandTotal;
      summary['All Delivery'] += data.delivery.grandTotal;
      data.deliveryCompanies.forEach(co => {
        deliveryByCompany[co.name] = (deliveryByCompany[co.name] || 0) + co.grandTotal;
      });
    });

    return [
      { name: 'Dine In', value: summary['Dine In'] },
      { name: 'Takeaway', value: summary['Takeaway'] },
      { name: 'All Delivery', value: summary['All Delivery'] },
      ...Object.entries(deliveryByCompany).map(([name, value]) => ({ name, value }))
    ];
  }, [reportData]);

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  if (isLoading) {
    return <div className="text-center py-16 text-slate-400 text-sm">Loading report...</div>;
  }

  if (reportData.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No orders found for selected period.</p>
      </div>
    );
  }

  // Grand summary across all days
  const grand = reportData.reduce(
    (acc, { data }) => {
      acc.count += data.all.count;
      acc.grandTotal += data.all.grandTotal;
      acc.subtotal += data.all.subtotal;
      acc.discount += data.all.discount;
      return acc;
    },
    { count: 0, grandTotal: 0, subtotal: 0, discount: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3 flex-wrap text-sm">
          <Badge variant="outline" className="text-base px-3 py-1">{reportData.length} days</Badge>
          <Badge variant="outline" className="text-base px-3 py-1">{grand.count} orders</Badge>
          <Badge className="bg-slate-800 text-white text-base px-3 py-1">{fmt(grand.grandTotal)}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToExcel(reportData, startDate, endDate)}>
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToWord(reportData, startDate, endDate)}>
            <Download className="w-4 h-4 mr-1" /> Word
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToPdf(reportData, startDate, endDate)}>
            <FileText className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Sales Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales Trend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="All Sales" stroke="#1f2937" strokeWidth={2} />
                <Line type="monotone" dataKey="Dine In" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Takeaway" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="All Delivery" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Category Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.map(({ date, data }) => ({
                date: date.slice(5),
                'Dine In': data.dineIn.grandTotal,
                'Takeaway': data.takeaway.grandTotal,
                'All Delivery': data.delivery.grandTotal,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Dine In" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Takeaway" stackId="a" fill="#f59e0b" />
                <Bar dataKey="All Delivery" stackId="a" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Delivery Company Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Companies Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.map(({ date, data }) => ({
                date: date.slice(5),
                ...Object.fromEntries(data.deliveryCompanies.map(co => [co.name, co.grandTotal]))
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend fontSize={11} />
                {companies.filter(c => (c.delivery_type || 'indirect') === 'indirect').map((co, idx) => (
                  <Bar key={co.id} dataKey={co.name} fill={COLORS[idx % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Overall Sales Composition Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Sales Composition</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorySummary}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categorySummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily cards */}
      {reportData.map(({ date, data }) => (
        <DayCard key={date} date={date} data={data} />
      ))}
    </div>
  );
}