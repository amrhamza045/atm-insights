import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const FIELDS = [
  { key: "email", label: "Support email" },
  { key: "website", label: "Website" },
  { key: "mobile", label: "Mobile" },
];

export default function VendorSupportSettings() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.functions.invoke("getVendorContact", {}).then(({ data }) => setForm(data));
  }, []);

  const save = async () => {
    setSaving(true);
    await base44.functions.invoke("saveVendorContact", form);
    setSaving(false);
    toast.success("Vendor details saved");
  };

  if (!form) return <Loader2 className="w-5 h-5 animate-spin text-slate-400" />;

  return (
    <Card>
      <CardHeader><CardTitle>Vendor / Support info</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">Shown in the manual footers. Empty fields are left out.</p>
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label>{f.label}</Label>
            <Input value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} dir="ltr" />
          </div>
        ))}
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </Button>
      </CardContent>
    </Card>
  );
}