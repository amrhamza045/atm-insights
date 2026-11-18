import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import LineExemptToggles from "@/components/catering/LineExemptToggles";

// Exempt chips plus a matching "Kitchen note" chip; the note box opens beneath.
export default function LineNoteToggle({ line, onChange }) {
  const [open, setOpen] = useState(!!line.kitchen_note);
  const toggle = () => { if (open) onChange({ kitchen_note: "" }); setOpen(!open); };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <LineExemptToggles line={line} onChange={onChange} />
        <Button type="button" size="sm" variant={open ? "default" : "outline"} className="h-7 gap-1 px-2 text-xs" onClick={toggle}>
          {open && <Check className="w-3 h-3" />} Kitchen note
        </Button>
      </div>
      {open && (
        <Textarea rows={2} value={line.kitchen_note || ""} onChange={(e) => onChange({ kitchen_note: e.target.value })} placeholder="Preparation or service instructions…" />
      )}
    </div>
  );
}