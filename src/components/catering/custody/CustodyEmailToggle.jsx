import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, MailX } from "lucide-react";
import { toast } from "sonner";
import { useCateringSettings } from "@/components/catering/useCateringSettings";

// Pauses/resumes all custody chain emails — the overdue nudges to assigned
// people and the owner/admin digest.
export default function CustodyEmailToggle() {
  const { isLoading, custodyEmailsEnabled, setCustodyEmailsEnabled } = useCateringSettings();
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      await setCustodyEmailsEnabled(!custodyEmailsEnabled);
      toast.success(!custodyEmailsEnabled ? "Custody emails resumed" : "Custody emails stopped");
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Could not update setting");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={saving}
      className={custodyEmailsEnabled ? "text-slate-700" : "text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-700"}
    >
      {custodyEmailsEnabled ? <Mail className="w-4 h-4 mr-1.5" /> : <MailX className="w-4 h-4 mr-1.5" />}
      {custodyEmailsEnabled ? "Emails: On — click to stop" : "Emails: Off — click to resume"}
    </Button>
  );
}