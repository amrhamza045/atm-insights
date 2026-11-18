import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

const REPORTS = [
  { key: "daily_financial_summary", label: "Daily Financial Summary", hint: "Sent daily at the hour set in Admin › Timezone." },
  { key: "delivery_compliance_report", label: "Delivery Compliance Report", hint: "Sent when a cashier session is closed." },
  { key: "inventory_weight_compliance", label: "Inventory Weight Compliance Report", hint: "Sent when someone emails it from Admin › Inventory Compliance." },
];
const toList = (s) => s.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function ReportRecipientsCard() {
  const qc = useQueryClient();
  const { data: record, isLoading } = useQuery({
    queryKey: ["reportRecipients"],
    queryFn: async () => (await base44.entities.ReportRecipientSettings.filter({ setting_key: "report_recipients" }))[0] || null,
  });
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm({ ...Object.fromEntries(REPORTS.map((r) => [r.key, (record?.[r.key] || []).join(", ")])), shared_report_link_days: String(record?.shared_report_link_days ?? 7) });
  }, [record]);

  const invalid = Object.fromEntries(REPORTS.map((r) => [r.key, toList(form[r.key] || "").filter((e) => !isEmail(e))]));
  const hasInvalid = REPORTS.some((r) => invalid[r.key].length);

  const save = async () => {
    setSaving(true);
    const data = { setting_key: "report_recipients", ...Object.fromEntries(REPORTS.map((r) => [r.key, toList(form[r.key] || "")])), shared_report_link_days: Math.min(90, Math.max(1, Math.round(Number(form.shared_report_link_days) || 7))) };
    if (record) await base44.entities.ReportRecipientSettings.update(record.id, data);
    else await base44.entities.ReportRecipientSettings.create(data);
    await qc.invalidateQueries({ queryKey: ["reportRecipients"] });
    setSaving(false);
    toast.success("Report recipients saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Users className="w-5 h-5 text-amber-600" />Report Recipients</CardTitle>
        <CardDescription>Who receives each automated report. Separate emails with commas. Empty = the report is not emailed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : REPORTS.map((r) => {
          const count = toList(form[r.key] || "").length;
          return (
            <div key={r.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label>{r.label}</Label>
                <span className={`text-xs ${count ? "text-emerald-700" : "text-slate-400"}`}>
                  {count ? `${count} recipient${count === 1 ? "" : "s"}` : "Not emailed"}
                </span>
              </div>
              <Textarea rows={2} value={form[r.key] || ""} onChange={(e) => setForm({ ...form, [r.key]: e.target.value })} />
              {invalid[r.key].length > 0 ? (
                <p className="text-xs text-red-600">Not a valid email: {invalid[r.key].join(", ")}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{r.hint}</p>
              )}
            </div>
          );
        })}
        {!isLoading && (
          <div className="space-y-1">
            <Label>Shared report link validity (days)</Label>
            <Input type="number" min={1} max={90} className="w-32" value={form.shared_report_link_days || ""} onChange={(e) => setForm({ ...form, shared_report_link_days: e.target.value })} />
            <p className="text-xs text-muted-foreground">How long a closed-session report link sent over WhatsApp keeps working (1–90, default 7).</p>
          </div>
        )}
        <Button onClick={save} disabled={saving || isLoading || hasInvalid}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save recipients
        </Button>
      </CardContent>
    </Card>
  );
}