import { useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TestResult from "./TestResult";

// Sends a short test to you, or to the saved added people, and shows who got it.
export default function SendTestButtons({ itemKey, addedCount, unsaved, sendTest }) {
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);

  const run = async (target) => {
    setBusy(target);
    setResult(null);
    try {
      const data = await sendTest(itemKey, target);
      setResult(data);
      if (data.failures.length) toast.error(`${data.failures.length} test email${data.failures.length === 1 ? "" : "s"} failed`);
      else toast.success(`Test sent to ${data.sent.length} address${data.sent.length === 1 ? "" : "es"}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Could not send the test");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="h-8 bg-white" disabled={!!busy} onClick={() => run("me")}>
          {busy === "me" ? <Loader2 className="animate-spin" /> : <FlaskConical />}Send a test to me
        </Button>
        <Button size="sm" variant="outline" className="h-8 bg-white" disabled={!!busy || unsaved || !addedCount} onClick={() => run("added")}>
          {busy === "added" ? <Loader2 className="animate-spin" /> : <FlaskConical />}
          Send a test to added people{addedCount ? ` (${addedCount})` : ""}
        </Button>
        {unsaved && <span className="text-xs text-amber-700">Save your changes to test the people you added.</span>}
      </div>
      {result && <TestResult result={result} />}
    </div>
  );
}