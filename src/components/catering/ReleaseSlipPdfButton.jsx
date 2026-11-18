import React, { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveArabicReleaseSlipPdf } from "./releaseSlipArabicPdf";

export default function ReleaseSlipPdfButton({ slip }) {
  const [saving, setSaving] = useState(false);

  const download = async (event) => {
    event.stopPropagation();
    setSaving(true);
    try {
      await saveArabicReleaseSlipPdf(slip);
      toast.success("تم إنشاء إذن الصرف بصيغة PDF");
    } catch (error) {
      console.error("Release slip Arabic PDF failed", error);
      toast.error(`تعذر إنشاء ملف PDF لإذن الصرف${error?.message ? ` — ${error.message}` : ""}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={saving} onClick={download}>
      <FileDown className="w-4 h-4" />
      {saving ? "جارٍ الإنشاء…" : "PDF عربي"}
    </Button>
  );
}