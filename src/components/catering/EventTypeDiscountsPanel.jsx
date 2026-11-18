import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { useCateringOptions } from "./useCateringOptions";
import { applyQuoteDiscount, resolveDiscount } from "./discountLogic";

export default function EventTypeDiscountsPanel({ actorEmail }) {
  const { selectedBranchId, selectedBranch } = useBranch();
  const queryClient = useQueryClient();
  const { options: eventTypes } = useCateringOptions("event_type");
  const [eventType, setEventType] = useState("");
  const [mode, setMode] = useState("percent");
  const [value, setValue] = useState("");
  const [targetMargin, setTargetMargin] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: rules = [] } = useQuery({
    queryKey: ["catering-event-type-discounts", selectedBranchId],
    queryFn: () => base44.entities.CateringEventTypeDiscount.filter({ branch_id: selectedBranchId }, "-created_date", 100),
    enabled: !!selectedBranchId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["catering-event-type-discounts"] });
    queryClient.invalidateQueries({ queryKey: ["catering-quotes-active"] });
    queryClient.invalidateQueries({ queryKey: ["catering-events"] });
  };

  const applyToQuotes = async (rule) => {
    const events = await base44.entities.CateringEvent.filter({ branch_id: selectedBranchId, event_type: rule.event_type }, "-event_date", 300);
    const eventIds = new Set(events.map((e) => e.id));
    const quotes = await base44.entities.CateringQuote.filter({ branch_id: selectedBranchId }, "-created_date", 300);
    const targets = quotes.filter((q) => eventIds.has(q.event_id) && (q.status === "active" || q.status === "accepted"));

    for (const q of targets) {
      await applyQuoteDiscount({
        quote: q,
        discount: resolveDiscount(q, rule.discount_mode, rule.discount_value),
        reason: `Event type rule (${rule.event_type})${rule.reason ? ` — ${rule.reason}` : ""}`,
        actorEmail,
      });
    }
    return targets.length;
  };

  const handleCreate = async () => {
    if (!eventType) return toast.error("Pick an event type");
    if (!(Number(value) > 0) && targetMargin === "") return toast.error("Enter a discount or target margin");
    if (targetMargin !== "" && (Number(targetMargin) < 0 || Number(targetMargin) > 100)) return toast.error("Target margin must be 0–100%");
    setBusy(true);
    try {
      const rule = await base44.entities.CateringEventTypeDiscount.create({
        branch_id: selectedBranchId,
        branch_name: selectedBranch?.name || "",
        event_type: eventType,
        discount_mode: mode,
        discount_value: Number(value) || 0,
        target_margin_percentage: targetMargin === "" ? null : Number(targetMargin),
        reason,
        is_active: true,
        created_by_email: actorEmail || "",
      });
      const count = Number(value) > 0 ? await applyToQuotes(rule) : 0;
      await base44.entities.CateringEventTypeDiscount.update(rule.id, {
        last_applied_date: new Date().toISOString(),
        last_applied_count: count,
      });
      toast.success(`Rule saved — applied to ${count} quote${count === 1 ? "" : "s"}`);
      setEventType(""); setValue(""); setTargetMargin(""); setReason("");
      refresh();
    } catch (e) {
      toast.error(e.message || "Could not save the rule");
    } finally {
      setBusy(false);
    }
  };

  const handleReapply = async (rule) => {
    setBusy(true);
    try {
      const count = await applyToQuotes(rule);
      await base44.entities.CateringEventTypeDiscount.update(rule.id, {
        last_applied_date: new Date().toISOString(),
        last_applied_count: count,
      });
      toast.success(`Applied to ${count} quote${count === 1 ? "" : "s"}`);
      refresh();
    } catch (e) {
      toast.error(e.message || "Could not apply the rule");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (rule) => {
    await base44.entities.CateringEventTypeDiscount.update(rule.id, { is_active: !rule.is_active });
    refresh();
  };

  const saveTarget = async (rule, raw) => {
    const margin = raw === "" ? null : Number(raw);
    if (margin !== null && (margin < 0 || margin > 100)) return toast.error("Target margin must be 0–100%");
    await base44.entities.CateringEventTypeDiscount.update(rule.id, { target_margin_percentage: margin });
    refresh();
    toast.success("Event-type margin target saved");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-6 items-end rounded-lg border border-slate-200 p-3">
        <div className="md:col-span-2">
          <Label>Event type</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
            <SelectContent>
              {eventTypes.map((o) => (
                <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Type</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percentage (%)</SelectItem>
              <SelectItem value="amount">Fixed amount (EGP)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Value</Label>
          <Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div>
          <Label>Target margin %</Label>
          <Input type="number" min="0" max="100" step="0.1" value={targetMargin} onChange={(e) => setTargetMargin(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
        </div>
        <div className="md:col-span-6">
          <Button disabled={busy} onClick={handleCreate} className="bg-amber-600 hover:bg-amber-700">
            {busy ? "Working…" : "Save & apply to this event type"}
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-slate-500">No event-type discount rules yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event type</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Target margin</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Last applied</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.event_type}</TableCell>
                <TableCell>{r.discount_value > 0 ? (r.discount_mode === "percent" ? `${r.discount_value}%` : `${r.discount_value} EGP`) : "—"}</TableCell>
                <TableCell><Input className="w-24" type="number" min="0" max="100" step="0.1" defaultValue={r.target_margin_percentage ?? ""} placeholder="Default" onBlur={(e) => saveTarget(r, e.target.value)} /></TableCell>
                <TableCell className="text-slate-500">{r.reason || "—"}</TableCell>
                <TableCell className="text-slate-500 text-xs">
                  {r.last_applied_date ? `${new Date(r.last_applied_date).toLocaleDateString()} · ${r.last_applied_count || 0} quotes` : "—"}
                </TableCell>
                <TableCell><Switch checked={r.is_active !== false} onCheckedChange={() => toggle(r)} /></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" disabled={busy || r.is_active === false} onClick={() => handleReapply(r)}>
                    Re-apply
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}