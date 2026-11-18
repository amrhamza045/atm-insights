import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { receiptCall, openPdf } from "./receiptApi";
import ReceiptAutoSendCard from "./ReceiptAutoSendCard";
import ReceiptEmailCard from "./ReceiptEmailCard";
import ReceiptLayoutCard from "./ReceiptLayoutCard";
import ReceiptContentCard from "./ReceiptContentCard";

/** Catering › Settings › Client Receipt. */
export default function ReceiptSettingsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["catering-receipt-settings"], queryFn: () => receiptCall("get_settings") });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => { if (data?.settings) setForm(data.settings); }, [data]);

  if (isLoading) return <p className="text-sm text-slate-500 py-6 text-center">Loading receipt settings…</p>;
  if (error) return <Card className="p-6 text-sm text-red-600">{error.message}</Card>;
  if (!form) return null;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const act = async (name, fn) => {
    setBusy(name);
    try { await fn(); } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };
  const save = () => act("save", async () => {
    const res = await receiptCall("save_settings", { settings: form });
    setForm(res.settings);
    queryClient.invalidateQueries({ queryKey: ["catering-receipt-settings"] });
    queryClient.invalidateQueries({ queryKey: ["catering-receipt-auto"] });
    toast.success("Receipt settings saved");
  });
  const preview = (lang) => act(lang, async () => openPdf(await receiptCall("preview", { lang, settings: form })));
  const busyIcon = (name, Icon) => (busy === name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Client Receipt</h2>
          <p className="text-sm text-muted-foreground">The PDF receipt clients get for an approved payment.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!!busy} onClick={() => preview("en")}>{busyIcon("en", Eye)} Preview English</Button>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!!busy} onClick={() => preview("ar")}>{busyIcon("ar", Eye)} Preview Arabic</Button>
          <Button size="sm" className="gap-1.5" disabled={!!busy} onClick={save}>{busyIcon("save", Save)} Save</Button>
        </div>
      </div>
      <ReceiptAutoSendCard value={form} set={set} />
      <ReceiptEmailCard value={form} set={set} />
      <ReceiptLayoutCard value={form} set={set} />
      <ReceiptContentCard value={form} set={set} />
      <p className="text-xs text-muted-foreground">Previews use made-up figures and your unsaved changes.</p>
    </div>
  );
}