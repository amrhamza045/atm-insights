import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Landmark, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const METHODS = [
  { value: "bank_transfer", label: "Bank transfer", icon: Landmark },
  { value: "instapay", label: "InstaPay", icon: Smartphone },
  { value: "wallet", label: "Mobile wallet", icon: Wallet },
];

/**
 * Deposit step for the customer portal. Card payment is not live yet, so the only
 * options are offline transfers — the customer tells us they've sent it and a team
 * member verifies the funds before anything is treated as paid.
 */
export default function PortalDepositPanel({ event, quote }) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  if (quote?.status !== "accepted") return null;

  if (event.status === "deposit_pending_verification") {
    return (
      <Card className="p-4 space-y-1 border-amber-200 bg-amber-50">
        <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
          <Clock className="w-4 h-4" /> Awaiting verification
        </p>
        <p className="text-sm text-amber-800">
          Thank you — you told us you sent {formatCurrency(event.deposit_declared_amount || 0, true)} by{" "}
          {(event.deposit_declared_method || "").replace(/_/g, " ")}
          {event.deposit_declared_reference ? ` (ref ${event.deposit_declared_reference})` : ""}. Your deposit isn't
          confirmed yet — a member of our team will check the funds and confirm your booking.
        </p>
      </Card>
    );
  }

  if (event.status !== "deposit_pending") return null;

  const submit = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("declareCateringDeposit", {
        event_id: event.id,
        method,
        reference,
      });
      if (res.data?.error) toast.error(res.data.error);
      else {
        toast.success("Thank you — we'll verify your transfer and confirm your booking");
        await queryClient.invalidateQueries({ queryKey: ["portal-events"] });
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not submit your transfer details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Pay your deposit</p>
        <p className="text-sm text-slate-500">
          Deposit due: <span className="font-medium text-slate-900">{formatCurrency(event.required_deposit_amount || 0, true)}</span>
        </p>
      </div>

      <div>
        <Label className="text-xs">How did you send it?</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {METHODS.map((m) => (
            <Button
              key={m.value}
              type="button"
              size="sm"
              variant={method === m.value ? "default" : "outline"}
              className="gap-1.5 text-xs"
              onClick={() => setMethod(m.value)}
            >
              <m.icon className="w-3.5 h-3.5" /> {m.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Transfer reference</Label>
        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. transaction number" />
      </div>

      <p className="text-xs text-slate-500">
        These methods are verified by our team, not instantly. Once you submit, your booking stays unconfirmed until we've
        matched your transfer — usually within one business day. Paying by card online is coming soon.
      </p>

      <Button size="sm" disabled={saving || reference.trim().length < 3} onClick={submit}>
        I've sent the deposit
      </Button>
    </Card>
  );
}