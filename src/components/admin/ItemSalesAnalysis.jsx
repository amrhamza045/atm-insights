import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, FileText, Search, ChevronDown, ChevronUp,
  FileSpreadsheet, ImageDown
} from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { useBranch } from "@/components/branches/BranchContext";

// ── Helpers ────────────────────────────────────────────────────────────────

const calcSlope = (points) => {
  const n = points.length;
  if (n < 2) return 0;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
};

const isDirectOrder = (order, companies) => {
  if (order.order_type === "dine_in" || order.order_type === "takeaway") return true;
  if (order.order_type === "delivery") {
    const co = companies.find(
      (c) => c.id === order.delivery_company_id || c.name === order.delivery_company_name
    );
    return co?.delivery_type === "direct";
  }
  return true;
};

const SlopeIcon = ({ slope }) => {
  if (slope > 0.05) return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (slope < -0.05) return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
};

// ── Per-Item card ──────────────────────────────────────────────────────────

function ItemCard({ item, allDates, forceExpand, chartRef }) {
  const [expanded, setExpanded] = useState(false);
  const isExpanded = forceExpand || expanded;

  const dailyData = useMemo(() => {
    return allDates.map((date) => {
      const day = item.byDate[date] || { qty: 0, revenue: 0, direct: 0, indirect: 0 };
      return { date: date.slice(5), ...day };
    });
  }, [item, allDates]);

  const trendPoints = dailyData.map((d, i) => ({ x: i, y: d.qty }));
  const slope = calcSlope(trendPoints);
  const totalQty = item.totalQty;
  const totalRevenue = item.totalRevenue;
  const directPct = totalQty > 0 ? Math.round((item.totalDirect / totalQty) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="pb-2 pt-3 px-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <SlopeIcon slope={slope} />
            <CardTitle className="text-sm font-semibold truncate">{item.name}</CardTitle>
            {item.category && (
              <Badge variant="outline" className="text-xs hidden sm:inline-flex">{item.category}</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm shrink-0">
            <span className="text-slate-500">{totalQty} sold</span>
            <span className="font-semibold">{totalRevenue.toFixed(0)} EGP</span>
            <Badge className={directPct >= 50 ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}>
              {directPct}% Direct
            </Badge>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 px-4 pb-4 space-y-4" ref={chartRef}>
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium">
              Daily Quantity Trend &nbsp;
              <span className={slope > 0.05 ? "text-green-600" : slope < -0.05 ? "text-red-600" : "text-slate-400"}>
                (slope {slope > 0 ? "+" : ""}{slope.toFixed(2)}/day)
              </span>
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v, n) => [v, n === "qty" ? "Quantity" : "Revenue"]} />
                <Line type="monotone" dataKey="qty" stroke="#6366f1" dot={false} strokeWidth={2} name="qty" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium">Direct vs Indirect Sales (qty per day)</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="direct" name="Direct" fill="#3b82f6" stackId="a" />
                <Bar dataKey="indirect" name="Indirect" fill="#f97316" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Excel export ───────────────────────────────────────────────────────────

const exportToExcel = (items, allDates, startDate, endDate) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ["Item", "Category", "Total Qty", "Total Revenue (EGP)", "Direct Qty", "Indirect Qty", "Direct %", "Trend Slope/day"],
    ...items.map((item) => {
      const trendPoints = allDates.map((d, i) => ({ x: i, y: item.byDate[d]?.qty || 0 }));
      const slope = calcSlope(trendPoints);
      const directPct = item.totalQty > 0 ? ((item.totalDirect / item.totalQty) * 100).toFixed(1) : 0;
      return [
        item.name,
        item.category || "",
        item.totalQty,
        parseFloat(item.totalRevenue.toFixed(2)),
        item.totalDirect,
        item.totalIndirect,
        parseFloat(directPct),
        parseFloat(slope.toFixed(4)),
      ];
    }),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Sheet 2: Daily data — rows = items, cols = dates
  const dailyQtyHeader = ["Item", "Category", ...allDates];
  const dailyQtyRows = items.map((item) => [
    item.name,
    item.category || "",
    ...allDates.map((d) => item.byDate[d]?.qty || 0),
  ]);
  const dailyQtySheet = XLSX.utils.aoa_to_sheet([dailyQtyHeader, ...dailyQtyRows]);
  XLSX.utils.book_append_sheet(wb, dailyQtySheet, "Daily Qty");

  // Sheet 3: Daily Revenue
  const dailyRevHeader = ["Item", "Category", ...allDates];
  const dailyRevRows = items.map((item) => [
    item.name,
    item.category || "",
    ...allDates.map((d) => parseFloat((item.byDate[d]?.revenue || 0).toFixed(2))),
  ]);
  const dailyRevSheet = XLSX.utils.aoa_to_sheet([dailyRevHeader, ...dailyRevRows]);
  XLSX.utils.book_append_sheet(wb, dailyRevSheet, "Daily Revenue");

  // Sheet 4: Daily Direct Qty
  const dailyDirectHeader = ["Item", "Category", ...allDates];
  const dailyDirectRows = items.map((item) => [
    item.name,
    item.category || "",
    ...allDates.map((d) => item.byDate[d]?.direct || 0),
  ]);
  const dailyDirectSheet = XLSX.utils.aoa_to_sheet([dailyDirectHeader, ...dailyDirectRows]);
  XLSX.utils.book_append_sheet(wb, dailyDirectSheet, "Daily Direct");

  // Sheet 5: Daily Indirect Qty
  const dailyIndirectHeader = ["Item", "Category", ...allDates];
  const dailyIndirectRows = items.map((item) => [
    item.name,
    item.category || "",
    ...allDates.map((d) => item.byDate[d]?.indirect || 0),
  ]);
  const dailyIndirectSheet = XLSX.utils.aoa_to_sheet([dailyIndirectHeader, ...dailyIndirectRows]);
  XLSX.utils.book_append_sheet(wb, dailyIndirectSheet, "Daily Indirect");

  XLSX.writeFile(wb, `item-sales-${startDate}-to-${endDate}.xlsx`);
};

// ── PDF Charts export ──────────────────────────────────────────────────────

const exportChartsToPdf = async (items, allDates, startDate, endDate, cardRefs) => {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let firstPage = true;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const el = cardRefs.current[i];
    if (!el) continue;

    if (!firstPage) doc.addPage();
    firstPage = false;

    // Title
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(item.name, 10, 12);
    doc.setFontSize(8);
    doc.setTextColor(100);
    const directPct = item.totalQty > 0 ? ((item.totalDirect / item.totalQty) * 100).toFixed(0) : 0;
    doc.text(
      `Qty: ${item.totalQty}  |  Revenue: ${item.totalRevenue.toFixed(2)} EGP  |  Direct: ${directPct}%  |  Period: ${startDate} → ${endDate}`,
      10, 19
    );

    // Capture chart area
    const canvas = await html2canvas(el, { scale: 1.5, backgroundColor: "#ffffff", logging: false });
    const imgData = canvas.toDataURL("image/png");
    const imgW = pageW - 20;
    const imgH = Math.min((canvas.height / canvas.width) * imgW, pageH - 30);
    doc.addImage(imgData, "PNG", 10, 24, imgW, imgH);
  }

  doc.save(`item-charts-${startDate}-to-${endDate}.pdf`);
};

// ── Main component ─────────────────────────────────────────────────────────

export default function ItemSalesAnalysis({ startDate, endDate }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("qty");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  const cardRefs = useRef({});
  const { selectedBranchId } = useBranch();

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["itemSalesOrders", startDate, endDate],
    queryFn: () => base44.entities.Order.list("-created_date", 2000),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.entities.DeliveryCompany.list(),
  });

  const { items, allDates } = useMemo(() => {
    const filtered = orders.filter((o) => {
      if (!o.created_date) return false;
      if (!["paid", "completed"].includes(o.status)) return false;
      if (selectedBranchId && o.branch_id && o.branch_id !== selectedBranchId) return false;
      const d = new Date(o.created_date).toISOString().split("T")[0];
      return d >= startDate && d <= endDate;
    });

    const dateSet = new Set();
    filtered.forEach((o) => {
      dateSet.add(new Date(o.created_date).toISOString().split("T")[0]);
    });
    const allDates = Array.from(dateSet).sort();

    const itemMap = {};
    filtered.forEach((order) => {
      const date = new Date(order.created_date).toISOString().split("T")[0];
      const direct = isDirectOrder(order, companies);
      (order.items || []).forEach((item) => {
        const key = item.menu_item_id || item.name;
        if (!itemMap[key]) {
          itemMap[key] = {
            name: item.name,
            category: item.category || "",
            totalQty: 0,
            totalRevenue: 0,
            totalDirect: 0,
            totalIndirect: 0,
            byDate: {},
          };
        }
        const qty = item.quantity || 1;
        const rev = (item.price || 0) * qty;
        itemMap[key].totalQty += qty;
        itemMap[key].totalRevenue += rev;
        if (direct) itemMap[key].totalDirect += qty;
        else itemMap[key].totalIndirect += qty;

        if (!itemMap[key].byDate[date]) {
          itemMap[key].byDate[date] = { qty: 0, revenue: 0, direct: 0, indirect: 0 };
        }
        itemMap[key].byDate[date].qty += qty;
        itemMap[key].byDate[date].revenue += rev;
        if (direct) itemMap[key].byDate[date].direct += qty;
        else itemMap[key].byDate[date].indirect += qty;
      });
    });

    return { items: Object.values(itemMap), allDates };
  }, [orders, companies, startDate, endDate]);

  const sortedItems = useMemo(() => {
    let list = items;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    if (sortBy === "qty") return [...list].sort((a, b) => b.totalQty - a.totalQty);
    if (sortBy === "revenue") return [...list].sort((a, b) => b.totalRevenue - a.totalRevenue);
    if (sortBy === "direct") return [...list].sort((a, b) => b.totalDirect - a.totalDirect);
    if (sortBy === "slope") {
      return [...list].sort((a, b) => {
        const sA = calcSlope(allDates.map((_, i) => ({ x: i, y: a.byDate[_]?.qty || 0 })));
        const sB = calcSlope(allDates.map((_, i) => ({ x: i, y: b.byDate[_]?.qty || 0 })));
        return sB - sA;
      });
    }
    return list;
  }, [items, search, sortBy, allDates]);

  const handleExportChartsPdf = async () => {
    setExportingPdf(true);
    setAllExpanded(true);
    // Wait for charts to render
    await new Promise((r) => setTimeout(r, 800));
    await exportChartsToPdf(sortedItems, allDates, startDate, endDate, cardRefs);
    setExportingPdf(false);
    setAllExpanded(false);
  };

  if (ordersLoading) {
    return <div className="text-center py-16 text-slate-400 text-sm">Loading item analysis...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm">No orders found for selected period.</p>
      </div>
    );
  }

  const totalSold = items.reduce((s, i) => s + i.totalQty, 0);
  const totalRevenue = items.reduce((s, i) => s + i.totalRevenue, 0);

  return (
    <div className="space-y-4">
      {/* Summary + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap text-sm">
          <Badge variant="outline" className="px-3 py-1">{items.length} items</Badge>
          <Badge variant="outline" className="px-3 py-1">{totalSold} units sold</Badge>
          <Badge className="bg-slate-800 text-white px-3 py-1">{totalRevenue.toFixed(0)} EGP</Badge>
          <Badge variant="outline" className="px-3 py-1">{allDates.length} days</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel(sortedItems, allDates, startDate, endDate)}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportChartsPdf}
            disabled={exportingPdf}
          >
            <ImageDown className="w-4 h-4 mr-1" />
            {exportingPdf ? "Generating..." : "Export Charts PDF"}
          </Button>
        </div>
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search item or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {[
            { key: "qty", label: "By Qty" },
            { key: "revenue", label: "By Revenue" },
            { key: "slope", label: "By Trend" },
            { key: "direct", label: "By Direct" },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={sortBy === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy(key)}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> Growing trend</span>
        <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> Declining trend</span>
        <span className="flex items-center gap-1"><Minus className="w-3 h-3 text-slate-400" /> Stable</span>
        <span className="text-slate-300">|</span>
        <span><span className="text-blue-600 font-semibold">Blue bar</span> = Direct</span>
        <span><span className="text-orange-500 font-semibold">Orange bar</span> = Indirect</span>
      </div>

      {/* Item cards */}
      <div className="space-y-2">
        {sortedItems.map((item, idx) => (
          <ItemCard
            key={item.name}
            item={item}
            allDates={allDates}
            forceExpand={allExpanded}
            chartRef={(el) => { cardRefs.current[idx] = el; }}
          />
        ))}
      </div>
    </div>
  );
}