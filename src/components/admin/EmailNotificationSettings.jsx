import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import ReportRecipientsCard from "@/components/admin/ReportRecipientsCard";
import { useEmailSettings } from "@/components/admin/email/useEmailSettings";
import { useEmailRecipients } from "@/components/admin/email/useEmailRecipients";
import { useEmailStats } from "@/components/admin/email/useEmailActivity";
import { emailIssues } from "@/components/admin/email/emailIssues";
import EmailOverview from "@/components/admin/email/EmailOverview";
import EmailGroups from "@/components/admin/email/EmailGroups";
import EmailActivityCard from "@/components/admin/email/EmailActivityCard";
import EmailSaveBar from "@/components/admin/email/EmailSaveBar";
import StaffSentEmails from "@/components/admin/email/StaffSentEmails";

const scrollTo = (id) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

export default function EmailNotificationSettings() {
  const settings = useEmailSettings();
  const ctx = useEmailRecipients();
  const { data: stats } = useEmailStats();
  const [openKey, setOpenKey] = useState(null);
  const [activityKey, setActivityKey] = useState("all");

  const save = async () => {
    try {
      await settings.save();
      toast.success("Email settings saved");
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Could not save the email settings");
    }
  };
  const showEmail = (key) => { setOpenKey(key); scrollTo(`email-row-${key}`); };
  const showActivity = (key) => { setActivityKey(key); scrollTo("email-activity"); };

  if (settings.isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Email notifications</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose which automatic emails go out, who receives each one, and check what was sent.
        </p>
      </div>
      <EmailOverview
        values={settings.values} recipients={settings.recipients} stats={stats} checking={ctx.isLoading}
        issues={emailIssues(settings.values, settings.recipients, ctx, stats)}
        onIssue={(issue) => (issue.kind === "failed" ? showActivity(issue.key) : showEmail(issue.key))}
      />
      <EmailGroups settings={settings} ctx={ctx} stats={stats} openKey={openKey} onOpenKey={setOpenKey} onShowActivity={showActivity} />
      <EmailActivityCard filterKey={activityKey} onFilterKey={setActivityKey} />
      <ReportRecipientsCard />
      <StaffSentEmails />
      {settings.changedKeys.size > 0 && (
        <EmailSaveBar count={settings.changedKeys.size} saving={settings.saving} onSave={save} onDiscard={settings.discard} />
      )}
    </div>
  );
}