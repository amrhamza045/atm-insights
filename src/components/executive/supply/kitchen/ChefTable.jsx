import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { CHEF_INFO } from "./kitchenConfig";

const COLUMNS = [
  { key: "name", label: "Chef" },
  { key: "batches", label: "Batches", format: "number" },
  { key: "on_time_rate", label: "On time", format: "percent" },
  { key: "prep_hours", label: "Prep time", format: "hours" },
];

// The people the Head Chef assigned to the period's batches, busiest first.
export default function ChefTable({ rows, unassigned }) {
  return (
    <ReportCard title="By chef" subtitle={unassigned > 0 ? `${unassigned} batch(es) had no one assigned` : undefined} info={CHEF_INFO}>
      <ListTable rows={rows} columns={COLUMNS} empty="No one was assigned to the period's batches." />
    </ReportCard>
  );
}