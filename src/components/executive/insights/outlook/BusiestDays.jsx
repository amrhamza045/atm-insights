import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { fmtNumber } from "@/components/executive/kit/formatters";

// The five days in the next 90 needing the most crew, against the staff on the books.
export default function BusiestDays({ d }) {
  const staff = d.staff_on_books;
  const columns = [
    { key: "date", label: "Day" },
    { key: "booked", label: "Booked events", render: (r) => fmtNumber(r.booked) },
    { key: "open", label: "Open enquiries", render: (r) => fmtNumber(r.open) },
    { key: "guests", label: "Guests", render: (r) => fmtNumber(r.guests) },
    {
      key: "crew", label: "Crew needed",
      render: (r) => <span className={staff != null && r.crew > staff ? "font-semibold text-danger-700" : ""}>{fmtNumber(r.crew)}</span>,
    },
  ];
  return (
    <ReportCard
      title="Busiest days ahead"
      subtitle={staff != null ? `${fmtNumber(staff)} regular and temporary staff on the books. Days needing more crew show in red.` : "Employees is switched off, so staff on the books isn't shown."}
      info={{ title: "Busiest days ahead", calculation: "Days in the next 90 with booked events, ranked by crew required, then guests. Staff on the books: active regular and temporary employees of the picked branches (freelancers not counted).", source: "Catering events and HR employees" }}
    >
      <ListTable rows={d.busiest} columns={columns} empty="No booked events in the next 90 days." />
    </ReportCard>
  );
}