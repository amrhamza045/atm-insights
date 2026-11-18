import React, { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import StaffRatingInput from "./StaffRatingInput";
import { useCateringEditAccess } from "@/components/catering/useCateringEditAccess";

export default function StaffFeedbackRow({ assignment, feedback, onSave }) {
  const { canEditRecord } = useCateringEditAccess();
  const readOnly = !canEditRecord(assignment);
  const [rating, setRating] = useState(feedback?.rating || 0);
  const [comment, setComment] = useState(feedback?.comment || "");
  const [saving, setSaving] = useState(false);

  const dirty = rating !== (feedback?.rating || 0) || comment !== (feedback?.comment || "");

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ assignment, feedback, rating, comment });
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{assignment.employee_name}</TableCell>
      <TableCell className="text-slate-500">{assignment.role_name}</TableCell>
      <TableCell><StaffRatingInput value={rating} onChange={setRating} readOnly={readOnly} /></TableCell>
      <TableCell>
        <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Feedback notes" disabled={readOnly} />
      </TableCell>
      <TableCell className="text-right">
        {!readOnly && (
          <Button size="sm" variant="outline" disabled={!rating || !dirty || saving} onClick={save}>
            {saving ? "Saving…" : feedback ? "Update" : "Save"}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}