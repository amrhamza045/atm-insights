import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";

// Payroll of the months paid per department or branch, highest cost first.
// Groups of fewer than three people arrive pooled under Other.
export default function PayGroupTable({ title, by, rows, currency, info }) {
  const columns = [
    { key: "name", label: by },
    { key: "people", label: "People", format: "number" },
    { key: "cost", label: "Payroll cost", format: "money" },
    { key: "share", label: "Share", format: "percent" },
    { key: "per_person_month", label: "Per person / month", format: "money" },
    { key: "overtime", label: "Overtime pay", format: "money" },
  ];
  return (
    <ReportCard title={title} info={info}>
      <ListTable rows={rows} columns={columns} currency={currency} empty="No payroll was run for the period's months." />
    </ReportCard>
  );
}