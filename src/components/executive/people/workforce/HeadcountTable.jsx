import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";

// Headcount and people on leave today, with the period's hires and leavers,
// per department or branch, most people first.
export default function HeadcountTable({ title, by, rows, info }) {
  const columns = [
    { key: "name", label: by },
    { key: "headcount", label: "Headcount", format: "number" },
    { key: "on_leave", label: "On leave", format: "number" },
    { key: "hires", label: "Hires", format: "number" },
    { key: "leavers", label: "Leavers", format: "number" },
  ];
  return (
    <ReportCard title={title} info={info}>
      <ListTable rows={rows} columns={columns} empty="No one is on the HR roster for this selection." />
    </ReportCard>
  );
}