import React, { useState } from "react";
import { uploadPrivateReceipt } from "@/lib/privateFiles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export default function PaymentProofField({ value, onChange, disabled }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uri = await uploadPrivateReceipt(file);
      onChange({ uri, name: file.name || "Payment confirmation" });
    } catch (err) {
      toast.error(err?.message || "Failed to upload payment confirmation");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <Label>Payment confirmation (optional)</Label>
      {value?.uri ? (
        <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-medium text-emerald-900 truncate">{value.name}</span>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2" disabled={disabled} onClick={() => onChange(null)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <label className="mt-1.5 flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 py-3 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{uploading ? "Uploading…" : "Upload image or document (PDF, JPG, PNG…)"}</span>
          <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFile} disabled={uploading || disabled} />
        </label>
      )}
    </div>
  );
}