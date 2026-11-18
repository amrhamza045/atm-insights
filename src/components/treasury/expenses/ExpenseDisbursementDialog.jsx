import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/components/treasury/treasuryApi";

export default function ExpenseDisbursementDialog({
  initialKind = "operating_expense",
  branches = [],
  defaultBranchId = "",
  expenseTypes = [],
  custodies = [],
  paymentMethods = [],
  suppliers = [],
  openInvoices = [],
  currency = "EGP",
  vendorApMapped = true,
  onClose,
  onSubmit,
  busy,
}) {
  const activeTypes = expenseTypes.filter((t) => t.is_active);
  const [kind, setKind] = useState(initialKind);
  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [expenseTypeId, setExpenseTypeId] = useState(activeTypes[0]?.id || "");
  const [recipient, setRecipient] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [invoiceId, setInvoiceId] = useState("none");
  const [sourceType, setSourceType] = useState(custodies.length > 0 ? "custody" : "payment_method");
  const [custodyId, setCustodyId] = useState(custodies[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState(
    paymentMethods.find((m) => m.is_default)?.code || paymentMethods[0]?.code || ""
  );
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  const amt = Number(amount) || 0;
  const selectedType = activeTypes.find((t) => t.id === expenseTypeId);
  const selectedCustody = custodies.find((c) => c.id === custodyId);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const supplierInvoices = openInvoices.filter((inv) => inv.supplier_id === supplierId);

  const insufficientCustody =
    sourceType === "custody" && selectedCustody && amt > Number(selectedCustody.balance || 0) + 1e-9;
  const exceedsVendor =
    kind === "vendor_payment" && selectedSupplier && amt > Number(selectedSupplier.verified_balance || 0) + 1e-9;

  const canSubmit =
    !busy &&
    Boolean(branchId) &&
    amt > 0 &&
    description.trim().length >= 3 &&
    !insufficientCustody &&
    !exceedsVendor &&
    (kind === "operating_expense"
      ? Boolean(expenseTypeId)
      : Boolean(supplierId) && vendorApMapped && Number(selectedSupplier?.verified_balance || 0) > 0) &&
    (sourceType === "custody" ? Boolean(custodyId) : Boolean(paymentMethod));

  const handleSubmit = () => {
    onSubmit({
      disbursement_kind: kind,
      branch_id: branchId,
      entry_date: entryDate,
      amount: amt,
      expense_type_id: kind === "operating_expense" ? expenseTypeId : "",
      recipient: kind === "operating_expense" ? recipient : selectedSupplier?.name || "",
      supplier_id: kind === "vendor_payment" ? supplierId : "",
      invoice_id: kind === "vendor_payment" && invoiceId !== "none" ? invoiceId : "",
      source_type: sourceType,
      custody_id: sourceType === "custody" ? custodyId : "",
      payment_method: sourceType === "payment_method" ? paymentMethod : "",
      reference,
      description,
    });
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Expense or Vendor Disbursement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setKind("operating_expense")}
              className={`py-1.5 text-sm font-medium rounded-md transition-colors ${
                kind === "operating_expense" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Operating Expense
            </button>
            <button
              type="button"
              onClick={() => setKind("vendor_payment")}
              className={`py-1.5 text-sm font-medium rounded-md transition-colors ${
                kind === "vendor_payment" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Pay Vendor / Supplier
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
          </div>

          {kind === "operating_expense" ? (
            <div className="space-y-3">
              <div>
                <Label>Expense Type</Label>
                <Select value={expenseTypeId} onValueChange={setExpenseTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose configured expense type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTypes.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Configure Expense Types in the Expense Types & Accounts tab first
                      </SelectItem>
                    ) : (
                      activeTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.account_code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedType && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Debits GL Account: <strong>{selectedType.account_code} · {selectedType.account_name}</strong>
                  </p>
                )}
              </div>
              <div>
                <Label>Payee / Recipient (optional)</Label>
                <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Vendor or recipient name" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!vendorApMapped && (
                <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded">
                  VENDOR_AP_ACCOUNT is not mapped in Finance › Mapping Accounts yet.
                </p>
              )}
              <div>
                <Label>Vendor / Supplier (Verified Subledger Balance)</Label>
                <Select
                  value={supplierId}
                  onValueChange={(v) => {
                    setSupplierId(v);
                    setInvoiceId("none");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · Owed {formatMoney(currency, s.verified_balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSupplier && Number(selectedSupplier.verified_balance) <= 0 && (
                  <p className="text-xs text-warning-800 mt-1">
                    This supplier currently has 0.00 verified payable balance in this branch.
                  </p>
                )}
              </div>
              {supplierInvoices.length > 0 && (
                <div>
                  <Label>Link to Posted Purchase Invoice (optional)</Label>
                  <Select value={invoiceId} onValueChange={setInvoiceId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">General on-account vendor settlement</SelectItem>
                      {supplierInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoice_number} ({inv.invoice_date}) · {formatMoney(currency, inv.total_amount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
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
              {exceedsVendor && (
                <p className="text-xs text-destructive mt-1">
                  Exceeds supplier verified payable ({formatMoney(currency, selectedSupplier?.verified_balance)}).
                </p>
              )}
            </div>
            <div>
              <Label>Paid From</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custody">Staff Custody (Petty Cash)</SelectItem>
                  <SelectItem value="payment_method">Payment Method (Cash / Bank)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {sourceType === "custody" ? (
            <div>
              <Label>Active Staff Custody</Label>
              <Select value={custodyId} onValueChange={setCustodyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose active custody" />
                </SelectTrigger>
                <SelectContent>
                  {custodies.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No active staff custodies available
                    </SelectItem>
                  ) : (
                    custodies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.employee_name} · Available {formatMoney(c.currency || currency, c.balance)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {insufficientCustody && (
                <p className="text-xs text-destructive mt-1">
                  Blocked: insufficient custody balance ({formatMoney(currency, selectedCustody?.balance)} available).
                </p>
              )}
            </div>
          ) : (
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.name} ({m.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Voucher / Invoice Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Receipt or ref #" />
            </div>
            <div>
              <Label>Description*</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Reason / details" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Disbursements are routed through System Role Group approval before deducting custody/cash or posting to the General Ledger.
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