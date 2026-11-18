import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EDITIONS } from "./companiesApi";

const selectClass = "w-full h-9 border border-input rounded-md px-2 bg-background text-sm font-normal";

export default function CompanyFormDialog({ company, act, onClose }) {
  const submit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    const payload = company
      ? { action: "update_company", company_id: company.id, data: { name: d.name, registration_number: d.registration_number } }
      : { action: "create_company", data: { ...d, currency_decimals: Number(d.currency_decimals), is_test: d.is_test === "on" } };
    act.mutate(payload, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{company ? "Edit Company" : "Add Company"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Label className="block space-y-1">Company name *<Input name="name" defaultValue={company?.name} required maxLength={200} /></Label>
          <Label className="block space-y-1">Registration number<Input name="registration_number" defaultValue={company?.registration_number} maxLength={100} /></Label>
          {company ? (
            <p className="text-xs text-slate-500">Currency {company.currency} · {company.currency_decimals} decimals · {EDITIONS.find((e) => e.value === company.edition)?.label}. These are fixed once the company is created.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Label className="space-y-1">Currency *<Input name="currency" defaultValue="EGP" pattern="[A-Za-z]{3}" maxLength={3} required /></Label>
                <Label className="space-y-1">Currency decimals
                  <select name="currency_decimals" defaultValue="2" className={selectClass}><option>0</option><option>2</option><option>3</option></select>
                </Label>
              </div>
              <Label className="block space-y-1">Business type
                <select name="edition" defaultValue="fnb" className={selectClass}>{EDITIONS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}</select>
              </Label>
              <label className="flex gap-2 text-sm"><input name="is_test" type="checkbox" />Test company (not production accounting)</label>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={act.isPending}>{act.isPending ? "Saving..." : company ? "Save Company" : "Create Company"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}