import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export default function ConnectionFields({ meta, form, set }) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={meta.accountLabel} value={form.account_name} onChange={(v) => set("account_name", v)} placeholder={meta.accountPlaceholder} />
        <Field label={meta.idLabel} value={form.account_id} onChange={(v) => set("account_id", v)} placeholder={meta.idPlaceholder || "e.g. 1234567890"} />
        {meta.appLabel && (
          <Field label={meta.appLabel} value={form.app_id} onChange={(v) => set("app_id", v)} placeholder="Platform app ID" />
        )}
        <Field label="Default campaign label" value={form.default_campaign} onChange={(v) => set("default_campaign", v)} placeholder="e.g. Ramadan Catering" />
      </div>
      <Field label="Notes" value={form.notes} onChange={(v) => set("notes", v)} placeholder="Internal notes" />
    </>
  );
}