import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Store } from "lucide-react";
import { formatMoney } from "@/components/treasury/treasuryApi";

export default function ExpenseDisbursementsTab({
  disbursements = [],
  currency = "EGP",
  canEdit,
  onOpenNew,
}) {
  const [kindFilter, setKindFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = disbursements.filter(
    (d) =>
      (kindFilter === "all" || d.disbursement_kind === kindFilter) &&
      (statusFilter === "all" || d.status === statusFilter)
  );

  const approvedTotal = disbursements
    .filter((d) => d.status === "approved")
    .reduce((s, d) => s + Number(d.amount || 0), 0);
  const pendingTotal = disbursements
    .filter((d) => d.status === "pending")
    .reduce((s, d) => s + Number(d.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Approved Disbursements</p>
            <p className="text-2xl font-bold mt-1">{formatMoney(currency, approvedTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Awaiting Approval</p>
            <p className="text-2xl font-bold mt-1">{formatMoney(currency, pendingTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Treasury Movement</p>
            {canEdit ? (
              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" onClick={() => onOpenNew("operating_expense")} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Expense
                </Button>
                <Button size="sm" variant="outline" onClick={() => onOpenNew("vendor_payment")} className="gap-1">
                  <Store className="w-3.5 h-3.5" /> Pay Vendor
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">View-only access</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Disbursement & Vendor Payment Ledger</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-48 h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Disbursements</SelectItem>
              <SelectItem value="operating_expense">Operating Expenses</SelectItem>
              <SelectItem value="vendor_payment">Vendor Payments</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No disbursements match your current filter.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto border rounded-lg bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 border-b text-left">
              <tr>
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Expense Type / Vendor</th>
                <th className="px-3 py-2.5 font-medium">Paid From</th>
                <th className="px-3 py-2.5 font-medium">Description</th>
                <th className="px-3 py-2.5 font-medium text-right">Amount</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 whitespace-nowrap">{d.entry_date}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline">
                      {d.disbursement_kind === "vendor_payment" ? "Vendor Payment" : "Operating Expense"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    {d.disbursement_kind === "vendor_payment" ? (
                      <div>
                        <p className="font-medium">{d.supplier_name}</p>
                        {d.invoice_number && (
                          <p className="text-xs text-muted-foreground">Invoice {d.invoice_number}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">{d.expense_type_name}</p>
                        <p className="text-xs text-muted-foreground">GL {d.expense_account_code}</p>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {d.source_type === "custody"
                      ? `Custody · ${d.custody_holder_name}`
                      : `Method · ${d.payment_method_name || d.payment_method}`}
                  </td>
                  <td className="px-3 py-2.5 max-w-xs truncate">
                    {d.description}
                    {d.reference ? ` (${d.reference})` : ""}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                    {formatMoney(d.currency || currency, d.amount)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant={
                        d.status === "approved"
                          ? "default"
                          : d.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {d.status}
                    </Badge>
                    {d.rejection_reason && (
                      <p className="text-xs text-destructive mt-0.5">{d.rejection_reason}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}