import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const GROUPS = [
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "maintenance", label: "Maintenance" },
  { value: "rent", label: "Rent & Occupancy" },
  { value: "delivery", label: "Delivery & Transport" },
  { value: "marketing", label: "Marketing & Commercial" },
  { value: "administrative", label: "Administrative" },
  { value: "other", label: "Other Operating" },
];

const toSlug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

export default function ExpenseTypeDialog({ item, accounts = [], onClose, onSave, busy }) {
  const isEdit = Boolean(item?.id);
  const [name, setName] = useState(item?.name || "");
  const [code, setCode] = useState(item?.code || "");
  const [codeTouched, setCodeTouched] = useState(isEdit);
  const [categoryGroup, setCategoryGroup] = useState(item?.category_group || "other");
  const [accountId, setAccountId] = useState(item?.account_id || "");
  const [notes, setNotes] = useState(item?.notes || "");

  const handleNameChange = (val) => {
    setName(val);
    if (!isEdit && !codeTouched) {
      const generated = toSlug(val);
      setCode(/^[a-z]/.test(generated) ? generated : generated ? `exp_${generated}` : "");
    }
  };

  const canSubmit = !busy && name.trim().length > 0 && /^[a-z][a-z0-9_]{0,79}$/.test(code) && Boolean(accountId);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Expense Type · ${item.name}` : "New Configurable Expense Type"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Expense Name</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Electricity & Water"
              />
            </div>
            <div>
              <Label>Code {isEdit && "(locked)"}</Label>
              <Input
                value={code}
                disabled={isEdit}
                onChange={(e) => {
                  setCodeTouched(true);
                  setCode(e.target.value.toLowerCase());
                }}
                placeholder="electricity_water"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Reporting Group</Label>
              <Select value={categoryGroup} onValueChange={setCategoryGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>GL Expense Account Mapping</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select GL account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No active expense posting accounts
                    </SelectItem>
                  ) : (
                    accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes / Guidance (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="When staff should choose this expense type"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit}
              onClick={() =>
                onSave({
                  id: item?.id,
                  expected_updated_date: item?.updated_date,
                  data: { name, code, category_group: categoryGroup, account_id: accountId, notes },
                })
              }
            >
              {busy ? "Saving…" : isEdit ? "Save Mapping" : "Create Expense Type"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}