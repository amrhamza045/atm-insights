import ReportCard from "@/components/executive/kit/ReportCard";
import KpiCard from "@/components/executive/kit/KpiCard";
import { SLIP_KPIS } from "./attendanceConfig";

// Absences, minutes late and early leaving, each against the comparison.
export default function LatenessCard({ data: d }) {
  const vs = d.comparison.label.toLowerCase();
  return (
    <ReportCard title="Absences, lateness and early leaving">
      <div className="grid gap-3 sm:grid-cols-3">
        {SLIP_KPIS.map((m) => (
          <KpiCard key={m} metric={m} value={d.current[m]} previous={d.previous?.[m]} compareLabel={vs} missing="No clock-ins in the comparison period" />
        ))}
      </div>
    </ReportCard>
  );
}