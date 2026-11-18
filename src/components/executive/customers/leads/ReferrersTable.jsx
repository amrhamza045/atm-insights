import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import NameCell from "../NameCell";
import { REFERRERS_INFO, EVENTS_INFO } from "./leadsConfig";

// The guests who referred the period's leads, most leads first. People who
// can't open clients see the events the referrals came from instead.
export default function ReferrersTable({ referrals: r, currency }) {
  const named = !!r.referrers;
  const columns = [
    named ? { key: "name", label: "Guest", render: (x) => <NameCell name={x.name} detail={x.event} /> } : { key: "name", label: "Event" },
    { key: "lead_new", label: "Leads", format: "number" },
    { key: "lead_converted", label: "Converted", format: "number" },
    { key: "lead_booked", label: "Booked", format: "number" },
    ...(named && r.commissions ? [{ key: "commission", label: "Commission", format: "money" }] : []),
  ];
  return (
    <ReportCard title={named ? "Referrers" : "Referring events"} info={named ? REFERRERS_INFO : EVENTS_INFO}>
      <ListTable rows={named ? r.referrers : r.events} columns={columns} currency={currency} rowKey={(x) => x.id || x.name} empty="No guest referrals came in this period." />
    </ReportCard>
  );
}