import ListTable from "@/components/executive/kit/ListTable";
import NamedListCard from "../NamedListCard";
import NameCell from "../NameCell";
import { clientDetail, dayLabel } from "../customerLabels";
import { TOP_INFO } from "./clientsConfig";

// The period's clients, billed the most first (most events first for people
// who can't see client financials), with when each was first served.
export default function TopClientsTable({ rows, money, currency }) {
  const columns = [
    { key: "name", label: "Client", render: (c) => <NameCell name={c.name} detail={clientDetail(c)} /> },
    { key: "events", label: "Events", format: "number" },
    { key: "client_since", label: "First served", render: (c) => (c.first_time ? <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-navy">New · {dayLabel(c.client_since)}</span> : dayLabel(c.client_since)) },
    ...(money ? [{ key: "revenue", label: "Revenue", format: "money" }, { key: "share", label: "Share", format: "percent" }] : []),
  ];
  return (
    <NamedListCard title="Top clients" info={TOP_INFO} rows={rows} subtitle={money ? undefined : "Amounts per client are shown to people who can see client financials."}>
      <ListTable rows={rows || []} columns={columns} currency={currency} empty="No clients were served in this period." />
    </NamedListCard>
  );
}