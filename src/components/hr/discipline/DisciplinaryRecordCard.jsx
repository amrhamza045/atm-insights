import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Paperclip, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { typeMeta } from "./disciplineMeta";

const openFile = async (a) => {
  try {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: a.file_uri });
    window.open(signed_url, "_blank");
  } catch {
    toast.error("Could not open the document");
  }
};

export default function DisciplinaryRecordCard({ record, showEmployee, onEdit, onDelete }) {
  const m = typeMeta(record.action_type);
  return (
    <div className="border rounded-lg bg-white p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge className={m.color}>{m.label}</Badge>
          {showEmployee && <span className="font-medium text-sm">{record.employee_name}</span>}
          <span className="text-xs text-slate-500">{record.action_date}</span>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1">
            {onEdit && <Button size="icon" variant="ghost" onClick={() => onEdit(record)}><Pencil className="w-4 h-4" /></Button>}
            {onDelete && <Button size="icon" variant="ghost" className="text-red-600" onClick={() => onDelete(record)}><Trash2 className="w-4 h-4" /></Button>}
          </div>
        )}
      </div>
      <p className="text-sm font-medium">{record.reason}</p>
      {record.details && <p className="text-sm text-slate-600 whitespace-pre-wrap">{record.details}</p>}
      {record.outcome && <p className="text-sm"><span className="font-semibold">Outcome: </span>{record.outcome}</p>}
      {record.attachments?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {record.attachments.map((a) => (
            <button key={a.file_uri} onClick={() => openFile(a)} className="flex items-center gap-1 text-xs text-teal-700 underline">
              <Paperclip className="w-3 h-3" />{a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}