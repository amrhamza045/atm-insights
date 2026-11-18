import ListTable from "@/components/executive/kit/ListTable";
import NamedListCard from "../NamedListCard";
import { TEAM_INFO } from "./careConfig";

// Who looks after the clients: clients owned, the period's contacts and
// complaints, follow-ups overdue today and their clients' revenue.
export default function CareTeamTable({ rows, money, currency }) {
  const columns = [
    { key: "name", label: "Team member" },
    { key: "clients", label: "Clients owned", format: "number" },
    { key: "contacts", label: "Contacts", format: "number" },
    { key: "complaints", label: "Complaints", format: "number" },
    { key: "overdue", label: "Overdue follow-ups", format: "number" },
    ...(money ? [{ key: "revenue", label: "Their clients' revenue", format: "money" }] : []),
  ];
  return (
    <NamedListCard title="Care team" info={TEAM_INFO} rows={rows}>
      <ListTable rows={rows || []} columns={columns} currency={currency} empty="No one owns clients or logged a contact in this period." />
    </NamedListCard>
  );
}