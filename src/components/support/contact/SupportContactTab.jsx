import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LifeBuoy, ArrowLeft, ArrowRight, Send, Loader2, AlertCircle } from "lucide-react";
import TopicStep from "./TopicStep";
import DetailsStep from "./DetailsStep";
import ReviewStep from "./ReviewStep";
import SupportSent from "./SupportSent";

const STEPS = ["Topic", "Details", "Review"];
const EMPTY = { topic: "", subject: "", description: "", phone: "", priority: "normal" };

export default function SupportContactTab() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const detailsOk = form.subject.trim() && form.description.trim().length >= 10;

  const send = async () => {
    setSending(true); setError("");
    try {
      await base44.functions.invoke("submitSupportRequest", {
        category: form.topic, subject: form.subject, description: form.description,
        phone: form.phone, priority: form.priority, page: document.referrer ? new URL(document.referrer).pathname : "",
      });
      setSent(true);
    } catch (e) {
      setError(e?.response?.data?.error || "Your message could not be sent. Please try again.");
    } finally { setSending(false); }
  };

  const reset = () => { setForm(EMPTY); setStep(0); setSent(false); setError(""); };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 py-8 sm:p-6">
      <div className="space-y-2 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg"><LifeBuoy className="h-7 w-7 text-white" /></div>
        <h1 className="text-3xl font-bold text-slate-900">Contact Support</h1>
        <p className="text-slate-600">Tell us what's going on and our team will get back to you by email.</p>
      </div>
      <Card className="shadow-sm">
        <CardContent className="space-y-6 p-5 sm:p-6">
          {sent ? <SupportSent email={user?.email} onNew={reset} /> : (
            <>
              <div className="flex items-center gap-2">
                {STEPS.map((label, i) => (
                  <div key={label} className="flex flex-1 items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${i <= step ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>
                    <span className={`text-sm ${i === step ? "font-medium text-slate-900" : "text-slate-400"}`}>{label}</span>
                    {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
                  </div>
                ))}
              </div>
              {step === 0 && <TopicStep value={form.topic} onPick={(topic) => { set({ topic }); setStep(1); }} />}
              {step === 1 && <DetailsStep form={form} set={set} />}
              {step === 2 && <ReviewStep form={form} user={user} />}
              {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
              {step > 0 && (
                <div className="flex justify-between gap-3">
                  <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={sending}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
                  {step === 1 ? (
                    <Button onClick={() => setStep(2)} disabled={!detailsOk} className="bg-amber-500 text-white hover:bg-amber-600">Review<ArrowRight className="ml-1 h-4 w-4" /></Button>
                  ) : (
                    <Button onClick={send} disabled={sending} className="bg-amber-500 text-white hover:bg-amber-600">
                      {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{sending ? "Sending…" : "Send to support"}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}