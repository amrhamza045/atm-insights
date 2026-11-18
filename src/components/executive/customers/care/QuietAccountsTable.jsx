import ListTable from "@/components/executive/kit/ListTable";
import NamedListCard from "../NamedListCard";
import NameCell from "../NameCell";
import { dayLabel } from "../customerLabels";
import { QUIET_INFO } from "./careConfig";

// Corporate accounts with no contact logged for 90 days, as of today,
// longest without contact first. quiet: { count, rows }.
export default function QuietAccountsTable({ quiet }) {
  const columns = [
    { key: "name", label: "Client", render: (c) => <NameCell name={c.name} detail={c.owner} /> },
    { key: "last_contact", label: "Last contact", render: (c) => (c.last_contact ? dayLabel(c.last_contact) : "Never") },
    { key: "last_event", label: "Latest event", render: (c) => dayLabel(c.last_event) },
    { key: "events", label: "Events", format: "number" },
  ];
  return (
    <NamedListCard title={`Accounts gone quiet · ${quiet.count}`} info={QUIET_INFO} rows={quiet.rows} subtitle="Corporate clients, no contact in 90 days">
      <ListTable rows={quiet.rows || []} columns={columns} empty="Every corporate client was contacted in the last 90 days." />
    </NamedListCard>
  );
}