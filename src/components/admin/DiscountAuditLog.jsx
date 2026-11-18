import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { Search, Percent, Calendar, User, ArrowUpDown, FileText, FileSpreadsheet, FileDown, Eye, X, ExternalLink } from "lucide-react";
import moment from "moment";
import * as XLSX from "xlsx";

const typeLabels = {
  apply_discount: { label: "Manual Discount", icon: Percent, color: "bg-blue-100 text-blue-700" }
};

const fmtMoney = (v) => (Number(v || 0)).toFixed(2);

export default function DiscountAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const all = await base44.entities.AuditLog.list("-created_date", 500);
      const filtered = all.filter(l => {
        const d = new Date(l.created_date);
        const inRange = d >= start && d <= end;
        const isType = l.action_type === "apply_discount";
        return inRange && isType;
      });
      setLogs(filtered);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [startDate, endDate]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const matchType = typeFilter === "all" || l.action_type === typeFilter;
      const matchSearch = !search || 
        l.action_description?.toLowerCase().includes(search.toLowerCase()) ||
        l.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
        l.entity_name?.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [logs, typeFilter, search]);

  // Totals
  const totals = useMemo(() => {
    let discountTotal = 0, discountCount = 0;
    for (const l of filtered) {
      discountTotal += (l.changes?.discount_amount || 0);
      discountCount++;
    }
    return { discountTotal, discountCount };
  }, [filtered]);

  // Open order details in a new window
  // Open window synchronously (before any await) so browsers don't block the popup
  const openOrderDetails = (log) => {
    setSelectedLog(log);
    setOrderDetails(null);
    setOrderLoading(true);

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert("Popup blocked. Please allow popups for this site to view order details.");
      return;
    }
    win.document.write('<html><head><title>Loading...</title></head><body style="font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><p style="color:#64748b;">Loading order details...</p></body></html>');
    win.document.close();

    loadOrderIntoWindow(log, win);
  };

  const loadOrderIntoWindow = async (log, win) => {
    const orderId = log.entity_id || log.changes?.order_id;
    let order = null;

    if (orderId) {
      try {
        order = await base44.entities.Order.get(orderId);
      } catch (e) {
        console.error("Failed to load order", e);
      }
    }

    if (!order && orderId) {
      try {
        const matches = await base44.entities.Order.filter({});
        order = matches.find(o => o.id === orderId) || null;
      } catch (e) { /* ignore */ }
    }

    setOrderDetails(order);
    setOrderLoading(false);

    if (win.closed) return;
    win.document.open();
    win.document.write(buildOrderHtml(log, order));
    win.document.close();
  };

  const buildOrderHtml = (log, order) => {
    const meta = typeLabels[log.action_type] || { label: log.action_type };
    const f = (v) => fmtMoney(v);
    const esc = (v) => (v === null || v === undefined) ? '—' : String(v);

    const orderTypeLabel = (t) => {
      if (!t) return '—';
      const map = { dine_in: 'Dine In', delivery: 'Delivery', takeaway: 'Takeaway' };
      return map[t] || t;
    };

    const deliveryAddressHtml = order?.delivery_address
      ? Object.entries(order.delivery_address).map(([k, v]) => `<tr><td style="${tdL}">${k}</td><td style="${tdL}">${esc(v)}</td></tr>`).join('')
      : '';

    let itemsRows = '';
    if (order?.items?.length) {
      order.items.forEach((it, i) => {
        let opts = '';
        if (it.selected_options) {
          try { opts = Object.values(it.selected_options).flat().map(o => o.label || o).join(', '); } catch(e) { opts = ''; }
        }
        itemsRows += `<tr>
          <td style="${tdC}">${i + 1}</td>
          <td style="${tdL}">${esc(it.name)}${opts ? `<br><span style="color:#94a3b8;font-size:10px;">${opts}</span>` : ''}</td>
          <td style="${tdC}">${it.quantity || 1}</td>
          <td style="${tdR}">${f(it.price)}</td>
          <td style="${tdR}">${f((it.price || 0) * (it.quantity || 1) + (it.option_price_modifier || 0) * (it.quantity || 1))}</td>
        </tr>`;
      });
    } else {
      itemsRows = `<tr><td colspan="5" style="${tdC};color:#94a3b8;">No order data linked to this audit entry.</td></tr>`;
    }

    const changesRows = log.changes
      ? Object.entries(log.changes).map(([k, v]) => `<tr><td style="${tdL}">${k}</td><td style="${tdR}">${typeof v === 'object' ? JSON.stringify(v) : esc(v)}</td></tr>`).join('')
      : '<tr><td colspan="2" style="text-align:center;color:#94a3b8;">No change data</td></tr>';

    // Order details info grid
    const infoRow = (label, value) => `<tr><td style="${tdL};background:#f8fafc;font-weight:600;width:200px;">${label}</td><td style="${tdL}">${esc(value)}</td></tr>`;

    let orderInfoRows = '';
    if (order) {
      orderInfoRows = `
        ${infoRow('Order ID', order.id)}
        ${infoRow('Order Type', orderTypeLabel(order.order_type))}
        ${order.order_type === 'dine_in' ? infoRow('Table Number', order.table_number) : ''}
        ${order.order_type === 'dine_in' ? infoRow('Table ID', order.table_id) : ''}
        ${order.order_type === 'delivery' ? infoRow('Delivery Company', order.delivery_company_name) : ''}
        ${order.order_type === 'delivery' ? infoRow('Delivery Zone', order.delivery_zone_name) : ''}
        ${order.order_type === 'delivery' ? infoRow('Delivery Person', order.delivery_person_name) : ''}
        ${order.order_type === 'delivery' ? infoRow('Delivery Fee', f(order.delivery_fee)) : ''}
        ${order.order_type === 'delivery' && order.delivery_company_name ? infoRow('Delivery Company ID', order.delivery_company_id) : ''}
        ${infoRow('Customer Name', order.customer_name)}
        ${infoRow('Customer ID', order.customer_id)}
        ${infoRow('Order Created', order.created_date ? moment(order.created_date).format("MMM D, YYYY h:mm A") : '—')}
        ${infoRow('Last Updated', order.updated_date ? moment(order.updated_date).format("MMM D, YYYY h:mm A") : '—')}
        ${infoRow('Order Status', order.status)}
        ${infoRow('Payment Method', order.payment_method)}
        ${order.discount_amount > 0 ? infoRow('Discount Amount', `- ${f(order.discount_amount)}`) : ''}
        ${order.cashback_used > 0 ? infoRow('Cashback Used', f(order.cashback_used)) : ''}
        ${order.notes ? infoRow('Order Notes', order.notes) : ''}
        ${order.visa_amount ? infoRow('Visa Amount', f(order.visa_amount)) : ''}
        ${order.secondary_payment_method ? infoRow('Secondary Payment', `${order.secondary_payment_method} (${f(order.secondary_amount)})`) : ''}
        ${order.recharge_balance_deducted ? infoRow('Recharge Balance Used', f(order.recharge_balance_deducted)) : ''}
      `;
    }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Order Details — ${log.entity_name || log.entity_id || 'Audit'}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:13px;margin:24px;color:#1e293b;}
      h1{font-size:18px;margin:0 0 4px;}
      h2{font-size:14px;margin:20px 0 8px;color:#334155;}
      .meta{color:#64748b;font-size:12px;margin-bottom:16px;}
      table{border-collapse:collapse;width:100%;}
      th{background:#f1f5f9;padding:6px 10px;border:1px solid #cbd5e1;font-size:11px;}
      td{padding:6px 10px;border:1px solid #e2e8f0;}
      .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#fef3c7;color:#92400e;}
      .totals{margin-top:12px;}
      .totals td{border:none;padding:3px 10px;}
      .totals .label{text-align:right;color:#64748b;}
      .totals .grand{font-size:15px;font-weight:bold;}
      .btn-print{margin-top:20px;padding:8px 20px;background:#1e293b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;}
      .two-col{display:flex;gap:24px;flex-wrap:wrap;}
      .two-col > div{flex:1;min-width:350px;}
    </style></head><body>
    <h1>Order Details — Investigation Report</h1>
    <div class="meta">
      <strong>Audit Date:</strong> ${moment(log.created_date).format("MMM D, YYYY h:mm A")} &nbsp;|&nbsp;
      <strong>Admin:</strong> ${log.admin_email || '—'} &nbsp;|&nbsp;
      <span class="badge">${meta.label}</span>
    </div>

    <h2>Audit Description</h2>
    <p>${log.action_description || '—'}</p>

    ${order ? `<h2>Order Summary</h2>
    <table>
      <tbody>${orderInfoRows}</tbody>
    </table>` : ''}

    ${order?.delivery_address ? `<h2>Delivery Address</h2>
    <table>
      <tbody>${deliveryAddressHtml}</tbody>
    </table>` : ''}

    <div class="two-col">
      <div>
        <h2>Change Details (Audit)</h2>
        <table>
          <thead><tr><th style="text-align:left">Field</th><th style="text-align:right">Value</th></tr></thead>
          <tbody>${changesRows}</tbody>
        </table>
      </div>
      <div>
        <h2>Order Items</h2>
        <table>
          <thead><tr>
            <th style="text-align:center">#</th>
            <th style="text-align:left">Item</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Unit Price</th>
            <th style="text-align:right">Total</th>
          </tr></thead>
          <tbody>${itemsRows}</tbody>
        </table>
      </div>
    </div>

    ${order ? `<div class="totals">
      <table style="width:auto;margin-left:auto;">
        <tr><td class="label">Subtotal:</td><td style="text-align:right">${f(order.subtotal)}</td></tr>
        ${order.delivery_fee > 0 ? `<tr><td class="label">Delivery Fee:</td><td style="text-align:right">${f(order.delivery_fee)}</td></tr>` : ''}
        ${order.discount_amount > 0 ? `<tr><td class="label">Discount:</td><td style="text-align:right;color:#dc2626;">- ${f(order.discount_amount)}</td></tr>` : ''}
        <tr><td class="label">Tax:</td><td style="text-align:right">${f(order.tax)}</td></tr>
        <tr><td class="label">Service Charge:</td><td style="text-align:right">${f(order.service_charge)}</td></tr>
        ${order.cashback_used > 0 ? `<tr><td class="label">Cashback Used:</td><td style="text-align:right;color:#dc2626;">- ${f(order.cashback_used)}</td></tr>` : ''}
        ${order.recharge_balance_deducted ? `<tr><td class="label">Recharge Balance:</td><td style="text-align:right;color:#dc2626;">- ${f(order.recharge_balance_deducted)}</td></tr>` : ''}
        <tr class="grand"><td class="label">Grand Total:</td><td style="text-align:right">${f(order.total)}</td></tr>
        <tr><td class="label">Payment Method:</td><td style="text-align:right">${order.payment_method || '—'}</td></tr>
        <tr><td class="label">Order Status:</td><td style="text-align:right">${order.status || '—'}</td></tr>
      </table>
    </div>` : ''}

    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    </body></html>`;
  };

  // ── Export Functions ──────────────────────────────────────────────────────
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      ["Discount Audit Log Report"],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ["Date", "Type", "Order", "Admin", "Description", "Discount Amount (EGP)"]
    ];

    filtered.forEach(l => {
      const meta = typeLabels[l.action_type] || { label: l.action_type };
      rows.push([
        moment(l.created_date).format("YYYY-MM-DD HH:mm"),
        meta.label,
        l.entity_name || "—",
        l.admin_email || "—",
        l.action_description || "—",
        fmtMoney(l.changes?.discount_amount || 0)
      ]);
    });

    rows.push([]);
    rows.push(["", "", "", "", "TOTAL MANUAL DISCOUNTS:", fmtMoney(totals.discountTotal)]);
    rows.push(["", "", "", "", "GRAND TOTAL:", fmtMoney(totals.discountTotal)]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 26 }, { wch: 50 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "Discount Audit Log");
    XLSX.writeFile(wb, `discount-audit-log-${startDate}-to-${endDate}.xlsx`);
  };

  const buildReportHtml = () => {
    const f = (v) => fmtMoney(v);
    let rows = '';
    filtered.forEach(l => {
      const meta = typeLabels[l.action_type] || { label: l.action_type };
      rows += `<tr>
        <td style="${tdL}">${moment(l.created_date).format("MMM D, YYYY h:mm A")}</td>
        <td style="${tdL}">${meta.label}</td>
        <td style="${tdL}">${l.entity_name || '—'}</td>
        <td style="${tdL}">${l.admin_email || '—'}</td>
        <td style="${tdL}">${l.action_description || '—'}</td>
        <td style="${tdR}">${f(l.changes?.discount_amount || 0)}</td>
      </tr>`;
    });

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#1e293b;}
      h1{font-size:18px;margin:0 0 4px;}
      p.sub{color:#64748b;font-size:11px;margin:0 0 16px;}
      table{border-collapse:collapse;width:100%;}
      th{background:#f1f5f9;padding:6px 10px;border:1px solid #cbd5e1;font-size:11px;}
      td{padding:6px 10px;border:1px solid #e2e8f0;}
      .totals{margin-top:16px;font-size:12px;}
      .totals table{width:auto;margin-left:auto;}
      .totals td{border:none;padding:3px 12px;}
      .totals .label{text-align:right;color:#64748b;}
      .grand{font-weight:bold;font-size:14px;}
    </style></head><body>
    <h1>Discount Audit Log Report</h1>
    <p class="sub">Period: ${startDate} to ${endDate} &nbsp;|&nbsp; Generated: ${moment().format("MMM D, YYYY h:mm A")}</p>
    <table>
      <thead><tr>
        <th style="text-align:left">Date</th>
        <th style="text-align:left">Type</th>
        <th style="text-align:left">Order</th>
        <th style="text-align:left">Admin</th>
        <th style="text-align:left">Description</th>
        <th style="text-align:right">Amount (EGP)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <table>
        <tr><td class="label">Total Manual Discounts (${totals.discountCount}):</td><td style="text-align:right">${f(totals.discountTotal)}</td></tr>
        <tr class="grand"><td class="label">GRAND TOTAL:</td><td style="text-align:right">${f(totals.discountTotal)}</td></tr>
      </table>
    </div>
    </body></html>`;
  };

  const exportToWord = () => {
    const html = buildReportHtml();
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discount-audit-log-${startDate}-to-${endDate}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPdf = () => {
    const html = buildReportHtml();
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  const tdL = "border:1px solid #e2e8f0;padding:6px 10px;text-align:left;white-space:nowrap;";
  const tdR = "border:1px solid #e2e8f0;padding:6px 10px;text-align:right;white-space:nowrap;";
  const tdC = "border:1px solid #e2e8f0;padding:6px 10px;text-align:center;white-space:nowrap;";

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500">Manual Discounts</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-blue-600">{formatCurrency(totals.discountTotal)}</p><p className="text-xs text-slate-400">{totals.discountCount} applications</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500">Total Given</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-slate-800">{formatCurrency(totals.discountTotal)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500">Total Events</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{totals.discountCount}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2"><ArrowUpDown className="w-4 h-4" /> Discount Audit Log</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading || filtered.length === 0} className="gap-1">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportToWord} disabled={loading || filtered.length === 0} className="gap-1">
                <FileText className="w-4 h-4" /> Word
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPdf} disabled={loading || filtered.length === 0} className="gap-1">
                <FileDown className="w-4 h-4" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex gap-2 items-center">
              <Calendar className="w-4 h-4 text-slate-400" />
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36" />
              <span className="text-slate-400">–</span>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36" />
            </div>
            <div className="flex gap-2">
              <Button variant={typeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("all")}>All</Button>
              <Button variant={typeFilter === "apply_discount" ? "default" : "outline"} size="sm" onClick={() => setTypeFilter("apply_discount")} className="gap-1"><Percent className="w-3.5 h-3.5" /> Manual</Button>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search by email, order, or description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No discount events in this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-slate-500">
                    <th className="pb-2 pr-2">Date</th>
                    <th className="pb-2 pr-2">Type</th>
                    <th className="pb-2 pr-2">Order</th>
                    <th className="pb-2 pr-2">User</th>
                    <th className="pb-2 pr-2">Description</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(l => {
                    const meta = typeLabels[l.action_type] || { label: l.action_type, icon: null, color: "bg-slate-100" };
                    const Icon = meta.icon;
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="py-2 pr-2 whitespace-nowrap text-xs text-slate-500">{moment(l.created_date).format("MMM D, YYYY h:mm A")}</td>
                        <td className="py-2 pr-2"><Badge className={`text-xs ${meta.color}`}>{Icon && <Icon className="w-3 h-3 mr-1 inline" />}{meta.label}</Badge></td>
                        <td className="py-2 pr-2 font-mono text-xs">{l.entity_name || "—"}</td>
                        <td className="py-2 pr-2 text-xs flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> {l.admin_email || "—"}</td>
                        <td className="py-2 pr-2 text-xs max-w-xs truncate">{l.action_description || "—"}</td>
                        <td className="py-2 text-right font-medium text-xs">{formatCurrency(l.changes?.discount_amount || 0)}</td>
                        <td className="py-2 text-center">
                          <Button variant="ghost" size="sm" onClick={() => openOrderDetails(l)} className="gap-1 h-7 px-2">
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="text-xs">View</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}