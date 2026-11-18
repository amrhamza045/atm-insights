import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Plus, ArrowUpRight, RotateCcw } from "lucide-react";
import { formatMoney } from "@/components/treasury/treasuryApi";

const KIND_LABELS = {
  issue: "Initial Funding",
  replenishment: "Replenishment",
  hr_payout: "HR / Payroll Payout",
  expense_disbursement: "Operating Expense",
  vendor_payment: "Vendor Payment",
  return: "Returned to Treasury",
};

export default function CustodyBalancesTab({
  custodies = [],
  entries = [],
  currency = "EGP",
  canManage,
  bindingMapped,
  onOpenRequest,
}) {
  const [selectedHolder, setSelectedHolder] = useState("all");
  const active = custodies.filter((c) => c.status === "active");
  const totalAvailable = active.reduce((s, c) => s + Number(c.balance || 0), 0);
  const totalFunded = active.reduce((s, c) => s + Number(c.total_funded || 0), 0);
  const totalDisbursed = active.reduce((s, c) => s + Number(c.total_spent || 0), 0);

  const visibleEntries =
    selectedHolder === "all" ? entries : entries.filter((e) => e.custody_id === selectedHolder);

  return (
    <div className="space-y-6">
      {!bindingMapped && (
        <div className="rounded-lg border border-warning-300 bg-warning-50 p-4 text-sm text-warning-900">
          <strong>Configuration required:</strong> Open the <em>Configuration</em> tab to link your unified{" "}
          <code>CUSTODY_CONTROL_ACC</code> General Ledger summary account before submitting custody requests.
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Custody Balance</p>
            <p className="text-2xl font-bold mt-1">{formatMoney(currency, totalAvailable)}</p>
            <p className="text-xs text-muted-foreground mt-1">{active.length} active holder(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Funded (Active)</p>
            <p className="text-2xl font-bold mt-1">{formatMoney(currency, totalFunded)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Disbursed (Active)</p>
            <p className="text-2xl font-bold mt-1">{formatMoney(currency, totalDisbursed)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Per-Person Custody Balances
          </h2>
          <p className="text-xs text-muted-foreground">
            Detailed sub-ledger balances reporting to the unified Custody GL summary account. Maximum one active custody per person.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => onOpenRequest({ type: "issue" })} disabled={!bindingMapped} className="gap-1.5">
            <Plus className="w-4 h-4" /> Request New Custody
          </Button>
        )}
      </div>

      {active.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No active staff custodies yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.employee_name}</p>
                    {c.branch_name && <p className="text-xs text-muted-foreground">{c.branch_name}</p>}
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="rounded-md bg-muted p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</p>
                  <p className="text-2xl font-bold mt-0.5">{formatMoney(c.currency || currency, c.balance)}</p>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Funded: {formatMoney(c.currency || currency, c.total_funded)}</span>
                  <span>Used: {formatMoney(c.currency || currency, c.total_spent)}</span>
                </div>
                {canManage && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => onOpenRequest({ type: "replenishment", custody: c })}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> Replenish
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => onOpenRequest({ type: "settlement", custody: c })}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Settle / Return
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Custody Sub-ledger Movements</h3>
          <Select value={selectedHolder} onValueChange={setSelectedHolder}>
            <SelectTrigger className="w-60 h-9 bg-background">
              <SelectValue placeholder="All custody holders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All custody holders</SelectItem>
              {custodies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.employee_name} ({c.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {visibleEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-lg p-6 text-center bg-background">
            No custody movements recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto border rounded-lg bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 border-b text-left">
                <tr>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Staff Holder</th>
                  <th className="px-3 py-2.5 font-medium">Movement</th>
                  <th className="px-3 py-2.5 font-medium">Notes / Counterparty</th>
                  <th className="px-3 py-2.5 font-medium text-right">Change</th>
                  <th className="px-3 py-2.5 font-medium text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleEntries.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 whitespace-nowrap">{e.entry_date}</td>
                    <td className="px-3 py-2.5 font-medium">{e.employee_name}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline">{KIND_LABELS[e.kind] || e.kind}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-xs truncate">
                      {e.payment_method_name ? `${e.payment_method_name} · ` : ""}
                      {e.notes || "—"}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${Number(e.delta) >= 0 ? "text-success-700" : "text-danger-700"}`}>
                      {Number(e.delta) >= 0 ? "+" : ""}
                      {formatMoney(e.currency || currency, e.delta)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                      {formatMoney(e.currency || currency, e.balance_after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}