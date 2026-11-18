import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CustodyRequestDialog({
  dialog,
  employees = [],
  activeCustodies = [],
  paymentMethods = [],
  currency = "EGP",
  onClose,
  onSubmit,
  busy,
}) {
  const mode = dialog.type; // 'issue' | 'replenishment' | 'settlement'
  const preselected = dialog.custody || null;
  const activeEmpIds = new Set(activeCustodies.map((c) => c.employee_id));
  const eligibleEmployees = employees.filter((e) => !activeEmpIds.has(e.id));

  const [employeeId, setEmployeeId] = useState("");
  const [custodyId, setCustodyId] = useState(preselected?.id || activeCustodies[0]?.id || "");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(
    mode === "settlement" && preselected ? String(Number(preselected.balance || 0)) : ""
  );
  const [paymentMethod, setPaymentMethod] = useState(
    paymentMethods.find((m) => m.is_default)?.code || paymentMethods[0]?.code || ""
  );
  const [closeAfter, setCloseAfter] = useState(false);
  const [notes, setNotes] = useState("");

  const targetCustody = mode === "issue" ? null : activeCustodies.find((c) => c.id === custodyId) || preselected;
  const amt = Number(amount) || 0;
  const exceedsBalance = mode === "settlement" && targetCustody && amt > Number(targetCustody.balance || 0) + 1e-9;
  const closeMismatch =
    mode === "settlement" &&
    closeAfter &&
    targetCustody &&
    Math.abs(Number(targetCustody.balance || 0) - amt) > 1e-9;

  const canSubmit =
    !busy &&
    !exceedsBalance &&
    !closeMismatch &&
    (mode === "issue" ? Boolean(employeeId) : Boolean(targetCustody?.id)) &&
    (mode === "settlement" && closeAfter ? amt >= 0 : amt > 0) &&
    (amt === 0 || Boolean(paymentMethod));

  const handleSubmit = () => {
    onSubmit({
      request_type: mode,
      entry_date: entryDate,
      amount: amt,
      payment_method: amt > 0 ? paymentMethod : "",
      close_after_return: mode === "settlement" ? closeAfter : false,
      notes,
      ...(mode === "issue" ? { employee_id: employeeId } : { custody_id: targetCustody.id }),
    });
  };

  const title =
    mode === "issue"
      ? "Request New Staff Custody"
      : mode === "replenishment"
      ? "Request Custody Replenishment"
      : "Request Custody Settlement / Return";

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {mode === "issue" ? (
            <div>
              <Label>Staff Member (one active custody per person)</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleEmployees.length === 0 ? (
                    <SelectItem value="none" disabled>
                      All active staff already hold an active custody
                    </SelectItem>
                  ) : (
                    eligibleEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} {e.branch_name ? `· ${e.branch_name}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Active Staff Custody</Label>
              <Select value={targetCustody?.id || ""} onValueChange={setCustodyId} disabled={Boolean(preselected)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose custody" />
                </SelectTrigger>
                <SelectContent>
                  {activeCustodies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.employee_name} · Available {currency} {Number(c.balance || 0).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Accounting Date</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div>
              <Label>Amount ({currency})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              {exceedsBalance && (
                <p className="text-xs text-destructive mt-1">
                  Exceeds available custody balance ({currency} {Number(targetCustody?.balance || 0).toFixed(2)}).
                </p>
              )}
              {closeMismatch && (
                <p className="text-xs text-destructive mt-1">
                  To close custody, return the exact remaining balance ({currency} {Number(targetCustody?.balance || 0).toFixed(2)}).
                </p>
              )}
            </div>
          </div>

          {amt > 0 && (
            <div>
              <Label>{mode === "settlement" ? "Return To (Payment Method)" : "Fund From (Payment Method)"}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No active payment methods configured
                    </SelectItem>
                  ) : (
                    paymentMethods.map((m) => (
                      <SelectItem key={m.code} value={m.code}>
                        {m.name} ({m.code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "settlement" && (
            <label className="flex items-center gap-2 rounded-md border bg-muted p-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={closeAfter}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setCloseAfter(checked);
                  if (checked && targetCustody) setAmount(String(Number(targetCustody.balance || 0)));
                }}
                className="w-4 h-4"
              />
              <span>Close this custody once balance reaches 0.00</span>
            </label>
          )}

          <div>
            <Label>Reference / Purpose</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Voucher reference, purpose, or settlement note"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Submitting sends this request for System Role Group approval before posting to the General Ledger.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {busy ? "Submitting…" : "Submit for Approval"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}