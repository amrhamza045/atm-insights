import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ShieldCheck } from "lucide-react";

export default function CustodyConfigTab({
  binding,
  assetAccounts = [],
  paymentMethods = [],
  canConfigure,
  onSave,
  busy,
}) {
  const [accountId, setAccountId] = useState(binding?.account_id || "");

  useEffect(() => {
    setAccountId(binding?.account_id || "");
  }, [binding?.account_id]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unified Custody GL Summary Account</CardTitle>
          <CardDescription>
            All individual staff custodies track per-person balances in the Petty Cash & Custody sub-ledger while posting to this single General Ledger control account (<code>CUSTODY_CONTROL_ACC</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {binding ? (
            <div className="rounded-md bg-muted p-3 text-sm flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Currently Mapped Account</p>
                <p className="font-semibold">
                  {binding.account_code} · {binding.account_name}
                </p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Active
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-warning-800 bg-warning-50 border border-warning-200 rounded-md p-3">
              No GL summary account is mapped yet. Select an active Asset posting account below.
            </p>
          )}

          <div>
            <Label>Asset Posting Account</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={!canConfigure}>
              <SelectTrigger>
                <SelectValue placeholder="Choose Asset GL Account" />
              </SelectTrigger>
              <SelectContent>
                {assetAccounts.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No active Asset posting accounts found in Chart of Accounts
                  </SelectItem>
                ) : (
                  assetAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} · {a.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {canConfigure && (
            <div className="flex justify-end">
              <Button
                onClick={() => onSave({ account_id: accountId })}
                disabled={busy || !accountId || accountId === binding?.account_id}
                className="gap-1.5"
              >
                <Save className="w-4 h-4" />
                {busy ? "Saving…" : "Save Custody GL Account"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Internal Control & Treasury Rules</CardTitle>
          <CardDescription>
            Active controls enforced on every custody request and settlement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="border rounded-md p-3 space-y-1">
            <p className="font-medium">One Active Custody Per Staff Member</p>
            <p className="text-xs text-muted-foreground">
              Each employee may hold at most one open custody per accounting company. Additional funds use Replenishment.
            </p>
          </div>
          <div className="border rounded-md p-3 space-y-1">
            <p className="font-medium">Strict Balance Floor</p>
            <p className="text-xs text-muted-foreground">
              HR payouts, operating expenses, vendor payments, and returns are blocked whenever they exceed the holder’s available balance.
            </p>
          </div>
          <div className="border rounded-md p-3 space-y-1">
            <p className="font-medium">System Role Group Approvals</p>
            <p className="text-xs text-muted-foreground">
              Grant <em>Petty Cash & Custody Approvals</em> in <strong>Admin › Role Management</strong> to control which role groups approve funding and settlements.
            </p>
          </div>
          <div className="pt-1">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Active Treasury Payment Methods ({paymentMethods.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {paymentMethods.map((m) => (
                <Badge key={m.code} variant="outline">
                  {m.name} ({m.account_code})
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}