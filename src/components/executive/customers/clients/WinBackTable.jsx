import ListTable from "@/components/executive/kit/ListTable";
import NamedListCard from "../NamedListCard";
import NameCell from "../NameCell";
import { clientDetail, dayLabel } from "../customerLabels";

// Clients worth getting back in touch with (due to rebook, or gone quiet):
// their latest delivered event, when it was and what it was worth.
// list: { count, corporate, rows } — rows is null for people who can't open clients.
export default function WinBackTable({ title, subtitle, info, list, money, currency, empty }) {
  const columns = [
    { key: "name", label: "Client", render: (c) => <NameCell name={c.name} detail={clientDetail(c)} /> },
    { key: "last_event", label: "Latest event", render: (c) => <NameCell name={c.last_event} detail={`${c.last_type} · ${dayLabel(c.last_date)}`} /> },
    { key: "events", label: "Events", format: "number" },
    ...(money ? [{ key: "last_value", label: "Its value", format: "money" }] : []),
  ];
  const corporate = list.corporate ? ` · ${list.corporate} corporate` : "";
  return (
    <NamedListCard title={`${title} · ${list.count}`} info={info} rows={list.rows} subtitle={`${subtitle}${corporate}`}>
      <ListTable rows={list.rows || []} columns={columns} currency={currency} empty={empty} />
    </NamedListCard>
  );
}