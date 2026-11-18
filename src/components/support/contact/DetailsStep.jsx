import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function DetailsStep({ form, set }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Subject</Label>
        <Input value={form.subject} maxLength={150} onChange={(e) => set({ subject: e.target.value })} placeholder="A short summary of the issue" />
      </div>
      <div className="space-y-1.5">
        <Label>What happened?</Label>
        <Textarea rows={6} value={form.description} maxLength={4000} onChange={(e) => set({ description: e.target.value })}
          placeholder="Describe the issue, what you expected, and any event name or date it relates to." />
        <p className="text-xs text-slate-400">{form.description.length}/4000</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Phone (optional)</Label>
          <Input value={form.phone} maxLength={40} onChange={(e) => set({ phone: e.target.value })} placeholder="So we can call you back" />
        </div>
        <div className="space-y-1.5">
          <Label>How urgent is it?</Label>
          <div className="flex gap-2">
            {[["normal", "Normal"], ["urgent", "Urgent"]].map(([key, label]) => (
              <button key={key} type="button" onClick={() => set({ priority: key })}
                className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${form.priority === key ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}