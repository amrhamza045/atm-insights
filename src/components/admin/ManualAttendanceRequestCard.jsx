import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

export default function ManualAttendanceRequestCard({ record, canReview, isSelf, busy, onConfirm, onReject }) {
  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{record.employeeName}</p>
          <p className="text-sm text-slate-600">{new Date(record.sign_in_time).toLocaleString()}</p>
        </div>
        <Badge className="bg-amber-500">Awaiting HR confirmation</Badge>
      </div>
      {record.manual_request_note && <p className="text-sm"><span className="font-medium">Employee note:</span> {record.manual_request_note}</p>}
      <p className="text-xs text-slate-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{record.manual_location_captured ? "Location attached" : "No location attached"}</p>
      {isSelf && <p className="text-xs text-red-600">You cannot confirm your own attendance.</p>}
      {canReview && !isSelf && (
        <div className="flex gap-2">
          <Button size="sm" onClick={onConfirm} disabled={busy} className="bg-green-600 hover:bg-green-700">Confirm present</Button>
          <Button size="sm" variant="destructive" onClick={onReject} disabled={busy}>Reject</Button>
        </div>
      )}
    </div>
  );
}