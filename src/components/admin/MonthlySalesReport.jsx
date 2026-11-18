import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { CalendarRange } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

const orderDiscount = (o) =>
  (o.discount_amount || 0) + (o.global_discount_amount || 0) + (o.manual_discount_fixed || 0);

const emptyBucket = () => ({ gross: 0, net: 0, discount: 0, commissionOnGross: 0, commissionOnNet: 0, orders: 0 });

const add = (b, o, commissionPct) => {
  const net = o.total || 0;
  const discount = orderDiscount(o);
  const gross = net + discount;
  b.gross += gross;
  b.net += net;
  b.discount += discount;
  b.commissionOnGross += gross * (commissionPct / 100);
  b.commissionOnNet += net * (commissionPct / 100);
  b.orders += 1;
};

/**
 * Monthly sales totals for the months the user selects — gross (before discount),
 * net (after discount), and the delivery-commission views for Talabat and other
 * delivery partners, per month plus a combined column.
 */
export default function MonthlySalesReport() {
  const { selectedBranchId } = useBranch();
  const [selected, setSelected] = useState([monthKey(new Date())]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["monthlyReportOrders"],
    queryFn: () => base44.entities.Order.list("-created_date", 5000),
  });
  const { data: companies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.entities.DeliveryCompany.list("name"),
  });

  const paidOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.created_date &&
          ["paid", "completed"].includes(o.status) &&
          (!selectedBranchId || !o.branch_id || o.branch_id === selectedBranchId)
      ),
    [orders, selectedBranchId]
  );

  const availableMonths = useMemo(() => {
    const set = new Set(paidOrders.map((o) => monthKey(new Date(o.created_date))));
    return Array.from(set).sort().reverse();
  }, [paidOrders]);

  const commissionFor = (o) => {
    const c = companies.find((x) => x.id === o.delivery_company_id || x.name === o.delivery_company_name);
    return c?.commission_percentage || 0;
  };
  const isTalabat = (o) => (o.delivery_company_name || "").toLowerCase().includes("talabat");

  const columns = useMemo(() => {
    const keys = selected.slice().sort();
    const build = (list) => {
      const b = {
        dineIn: emptyBucket(),
        takeaway: emptyBucket(),
        talabat: emptyBucket(),
        otherDelivery: emptyBucket(),
        all: emptyBucket(),
      };
      list.forEach((o) => {
        const pct = o.order_type === "delivery" ? commissionFor(o) : 0;
        if (o.order_type === "dine_in") add(b.dineIn, o, 0);
        else if (o.order_type === "takeaway") add(b.takeaway, o, 0);
        else if (isTalabat(o)) add(b.talabat, o, pct);
        else add(b.otherDelivery, o, pct);
        add(b.all, o, pct);
      });
      return b;
    };
    const cols = keys.map((k) => ({
      key: k,
      label: monthLabel(k),
      data: build(paidOrders.filter((o) => monthKey(new Date(o.created_date)) === k)),
    }));
    if (cols.length > 1) {
      cols.push({
        key: "__total",
        label: "All selected",
        data: build(paidOrders.filter((o) => keys.includes(monthKey(new Date(o.created_date))))),
      });
    }
    return cols;
  }, [selected, paidOrders, companies]);

  const ROWS = [
    { label: "Total Sales — before discount", get: (d) => d.all.gross, strong: true },
    { label: "Total Discounts", get: (d) => d.all.discount },
    { label: "Total Sales — after discount", get: (d) => d.all.net, strong: true },
    { label: "Talabat — before commission & discount", get: (d) => d.talabat.gross, group: "Talabat" },
    { label: "Talabat — after commission (before discount)", get: (d) => d.talabat.gross - d.talabat.commissionOnGross },
    { label: "Talabat — after discount (before commission)", get: (d) => d.talabat.net },
    { label: "Talabat — after commission & discount", get: (d) => d.talabat.net - d.talabat.commissionOnNet, strong: true },
    { label: "Talabat commission", get: (d) => d.talabat.commissionOnNet },
    { label: "Other delivery — before commission & discount", get: (d) => d.otherDelivery.gross, group: "Other delivery" },
    { label: "Other delivery — after commission & discount", get: (d) => d.otherDelivery.net - d.otherDelivery.commissionOnNet },
    { label: "Other delivery commission", get: (d) => d.otherDelivery.commissionOnNet },
    { label: "Dine In — before discount", get: (d) => d.dineIn.gross, group: "Dine In" },
    { label: "Dine In — after discount", get: (d) => d.dineIn.net },
    { label: "Takeaway — before discount", get: (d) => d.takeaway.gross, group: "Takeaway" },
    { label: "Takeaway — after discount", get: (d) => d.takeaway.net },
    {
      label: "TOTAL sales before commission & discounts",
      get: (d) => d.all.gross,
      group: "Grand total",
      strong: true,
    },
    {
      label: "TOTAL sales after commission & discounts",
      get: (d) => d.all.net - d.all.commissionOnNet,
      strong: true,
    },
  ];

  const toggle = (k) => setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CalendarRange className="w-5 h-5 text-slate-700" />
          <div>
            <CardTitle>Monthly Report</CardTitle>
            <CardDescription>Select one or more months to compare totals side by side</CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-3">
          {availableMonths.map((k) => (
            <Button
              key={k}
              size="sm"
              variant={selected.includes(k) ? "default" : "outline"}
              className="text-xs"
              onClick={() => toggle(k)}
            >
              {monthLabel(k)}
            </Button>
          ))}
          {availableMonths.length > 0 && (
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSelected(availableMonths)}>
              Select all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading orders…</p>
        ) : columns.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">Select at least one month.</p>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="min-w-[280px]">Metric</TableHead>
                  {columns.map((c) => (
                    <TableHead key={c.key} className="text-right whitespace-nowrap">{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-slate-50/60">
                  <TableCell className="text-xs font-semibold text-slate-500">Orders</TableCell>
                  {columns.map((c) => (
                    <TableCell key={c.key} className="text-right text-xs text-slate-500">{c.data.all.orders}</TableCell>
                  ))}
                </TableRow>
                {ROWS.map((r, i) => (
                  <TableRow key={i} className={r.group ? "border-t-2 border-slate-200" : ""}>
                    <TableCell className={`text-sm ${r.strong ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                      {r.label}
                    </TableCell>
                    {columns.map((c) => (
                      <TableCell key={c.key} className={`text-right whitespace-nowrap ${r.strong ? "font-bold" : ""}`}>
                        {formatCurrency(r.get(c.data))}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}