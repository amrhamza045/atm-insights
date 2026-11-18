import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlugZap } from "lucide-react";
import ConnectionHeader from "./ConnectionHeader";
import ConnectionFields from "./ConnectionFields";
import ConnectionSetup from "./ConnectionSetup";

const formFrom = (record) => ({
  is_enabled: record?.is_enabled || false,
  account_name: record?.account_name || "",
  account_id: record?.account_id || "",
  app_id: record?.app_id || "",
  default_campaign: record?.default_campaign || "",
  notes: record?.notes || "",
});

export default function SocialConnectionCard({ meta, record, savedSecrets, onSave, onCheck, isSaving, isChecking }) {
  const [form, setForm] = useState(() => formFrom(record));
  useEffect(() => setForm(formFrom(record)), [record]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const busy = isSaving || isChecking;

  return (
    <Card className="p-5 border-0 shadow-sm space-y-4">
      <ConnectionHeader
        meta={meta}
        status={record?.connection_status || "not_connected"}
        enabled={form.is_enabled}
        onToggle={(v) => set("is_enabled", v)}
      />
      <ConnectionFields meta={meta} form={form} set={set} />
      <ConnectionSetup meta={meta} record={record} savedSecrets={savedSecrets} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onCheck(form)} disabled={busy} className="gap-1 shadow-md">
          <PlugZap className={`w-4 h-4 ${isChecking ? "animate-pulse" : ""}`} />
          {isChecking ? "Checking..." : "Check connection"}
        </Button>
        <Button onClick={() => onSave(form)} disabled={busy} className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
          Save
        </Button>
      </div>
    </Card>
  );
}