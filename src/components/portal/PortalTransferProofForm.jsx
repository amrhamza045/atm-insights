import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { uploadPrivateReceipt } from "@/lib/privateFiles";
import ReceiptLink from "@/components/shared/ReceiptLink";

/**
 * Customer-side upload form: a screenshot of a deposit transfer or of the full
 * amount transfer. Nothing financial is written — staff verify and record the payment.
 */
export default function PortalTransferProofForm({ event, depositDue, fullDue }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState("deposit");
  const [method, setMethod] = useState("bank_transfer");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggested = type === "deposit" ? depositDue : fullDue;

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      setFileUrl(await uploadPrivateReceipt(file));
      toast.success("Screenshot uploaded");
    } catch {
      toast.error("Could not upload the screenshot");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!fileUrl) return toast.error("Please attach a screenshot of the transfer");
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.CateringTransferProof.create({
        branch_id: event.branch_id,
        branch_name: event.branch_name,
        event_id: event.id,
        event_name: event.event_name,
        client_id: event.client_id,
        client_name: event.client_name,
        transfer_type: type,
        method,
        amount: Number(amount) || suggested || 0,
        reference: reference.trim(),
        transfer_date: transferDate || undefined,
        screenshot_url: fileUrl,
        status: "pending",
        submitted_by: user?.email,
        notes,
      });
      toast.success("Thank you — we'll verify your transfer and confirm it shortly");
      setFileUrl(""); setReference(""); setAmount(""); setNotes(""); setTransferDate("");
      await queryClient.invalidateQueries({ queryKey: ["portal-transfer-proofs", event.id] });
    } catch (e) {
      toast.error(e?.message || "Could not submit your transfer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">What did you transfer?</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Deposit ({formatCurrency(depositDue || 0, true)})</SelectItem>
              <SelectItem value="full_amount">Full amount ({formatCurrency(fullDue || 0, true)})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">How did you send it?</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bank_transfer">Bank transfer</SelectItem>
              <SelectItem value="instapay">InstaPay</SelectItem>
              <SelectItem value="wallet">Mobile wallet</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Amount transferred</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(suggested || 0)} />
        </div>
        <div>
          <Label className="text-xs">Date of transfer</Label>
          <Input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Transfer reference (optional)</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. transaction number" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Screenshot of the transfer</Label>
        <div className="mt-1 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-3 h-9 rounded-md border text-sm cursor-pointer hover:bg-slate-50">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {fileUrl ? "Replace image" : "Choose image"}
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={upload} />
          </label>
          {fileUrl && (
            <ReceiptLink value={fileUrl} className="text-xs text-blue-600 underline">View attached</ReceiptLink>
          )}
        </div>
      </div>

      <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know about this transfer?" />

      <p className="text-xs text-slate-500">
        Transfers are verified by our team, not instantly. Your payment is confirmed once we've matched it — usually within one business day.
      </p>

      <Button size="sm" className="gap-1.5" disabled={saving || uploading || !fileUrl} onClick={submit}>
        <Upload className="w-4 h-4" /> Submit transfer
      </Button>
    </div>
  );
}