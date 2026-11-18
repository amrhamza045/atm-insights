import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { fmtNumber } from "@/components/executive/kit/formatters";
import { PERFORMANCE_INFO } from "./suppliersConfig";

const COLUMNS = [
  { key: "name", label: "Supplier" },
  { key: "purchases_value", label: "Purchases", format: "money" },
  { key: "deliveries_received", label: "Deliveries", format: "number" },
  { key: "on_time_rate", label: "On time", format: "percent" },
  { key: "avg_lead_days", label: "Lead days", render: (r) => (r.avg_lead_days === null ? "—" : fmtNumber(r.avg_lead_days)) },
  { key: "rating", label: "Rating", render: (r) => (r.rating === null ? "—" : <span title={`Delivery ${r.delivery_rating ?? "—"} · quality ${r.quality_rating ?? "—"} · ${r.reviews} rating(s)`}>{r.rating.toFixed(1)}</span>) },
  { key: "balance", label: "Owed today", format: "money" },
];

// How each supplier did in the period, and what it is owed today.
export default function PerformanceCard({ rows, currency }) {
  return (
    <ReportCard title="Supplier performance" info={PERFORMANCE_INFO}>
      <ListTable rows={rows} columns={COLUMNS} currency={currency} empty="No supplier was bought from, delivered, was rated or is owed money." />
    </ReportCard>
  );
}