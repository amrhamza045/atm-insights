import React, { useRef, useState } from "react";
import { uploadPrivateReceipt } from "@/lib/privateFiles";
import ReceiptLink from "@/components/shared/ReceiptLink";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

/** Uploads a payment screenshot / receipt and reports back its public URL. */
export default function PaymentProofUpload({ value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadPrivateReceipt(file));
    } catch {
      toast.error("Could not upload the file");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <Label>Payment screenshot / receipt</Label>
      <p className="text-xs text-slate-500">
        Upload the client's transfer screenshot here — including one they sent over WhatsApp.
      </p>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={pick} />
      {value ? (
        <div className="flex items-center gap-2 mt-1">
          <ReceiptLink value={value} className="text-sm text-blue-600 underline truncate">View uploaded proof</ReceiptLink>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full gap-1.5 mt-1" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading…" : "Upload proof"}
        </Button>
      )}
    </div>
  );
}