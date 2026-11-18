import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import DisciplinaryRecordCard from "./DisciplinaryRecordCard";

/** Read-only disciplinary history inside the employee profile, with a link to manage in the HR Hub. */
export default function DisciplineHistorySection({ employee, onClose }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["disciplinaryActions", employee.id, "profile"],
    queryFn: async () =>
      (await base44.entities.DisciplinaryAction.filter({ employee_id: employee.id }, { sort: "-action_date", limit: 100 })).items,
  });
  const records = data || [];

  const manage = () => {
    onClose?.();
    navigate(`/HRHub?tab=hr-discipline&employee=${employee.id}`);
  };

  return (
    <div className="border rounded-lg bg-slate-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Disciplinary actions</h3>
        <Button size="sm" variant="outline" onClick={manage}>
          <ExternalLink className="w-3 h-3 mr-1" /> Manage in HR Hub
        </Button>
      </div>
      {isLoading ? <p className="text-sm text-slate-500">Loading…</p>
        : records.length === 0 ? <p className="text-sm text-slate-500">No disciplinary records for this employee.</p>
        : <div className="space-y-2">{records.map((r) => <DisciplinaryRecordCard key={r.id} record={r} />)}</div>}
    </div>
  );
}