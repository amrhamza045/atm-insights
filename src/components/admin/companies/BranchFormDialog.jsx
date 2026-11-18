import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EMPTY_BRANCH, BRANCH_SECTIONS, toBranchData } from "./branchFields";

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{title}</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
  </div>
);

export default function BranchFormDialog({ branch, companyId, companies, act, onClose }) {
  const [form, setForm] = useState({ ...EMPTY_BRANCH, ...(branch || {}), latitude: branch?.latitude ?? "", longitude: branch?.longitude ?? "" });
  const [company, setCompany] = useState(companyId || "");
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (e) => {
    e.preventDefault();
    act.mutate({ action: "save_branch", branch_id: branch?.id, company_id: company || undefined, data: toBranchData(form) }, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{branch ? "Edit Branch" : "Add Branch"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <Section title="Basic Information">
            <Label className="space-y-1">Branch Name *<Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></Label>
            <Label className="space-y-1">Branch Code<Input value={form.branch_code || ""} onChange={(e) => set("branch_code", e.target.value)} placeholder="e.g., BR2" /></Label>
            <Label className="space-y-1">Company *
              <select value={company} onChange={(e) => setCompany(e.target.value)} required className="w-full h-9 border border-input rounded-md px-2 bg-background text-sm font-normal">
                <option value="" disabled>Choose a company</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_test ? " (test)" : ""}</option>)}
              </select>
            </Label>
            <Label className="space-y-1">Address<Input value={form.address || ""} onChange={(e) => set("address", e.target.value)} /></Label>
            <div className="flex items-center gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_active !== false} onCheckedChange={(v) => set("is_active", v)} />Active</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.is_default} onCheckedChange={(v) => set("is_default", v)} />Default branch</label>
            </div>
          </Section>
          {BRANCH_SECTIONS.map((section) => (
            <Section key={section.title} title={section.title}>
              {section.fields.map(([key, label, type]) => (
                <Label key={key} className="space-y-1">{label}
                  <Input type={type || "text"} step={type === "number" ? "any" : undefined} value={form[key] ?? ""} onChange={(e) => set(key, e.target.value)} />
                </Label>
              ))}
            </Section>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={act.isPending}>{act.isPending ? "Saving..." : branch ? "Update Branch" : "Create Branch"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}