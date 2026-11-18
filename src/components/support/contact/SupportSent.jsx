import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SupportSent({ email, onNew }) {
  return (
    <div className="space-y-4 py-10 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
      <h2 className="text-2xl font-semibold text-slate-900">Your message is on its way</h2>
      <p className="mx-auto max-w-md text-slate-600">Our support team has received your report and will reply to <span className="font-medium">{email}</span>.</p>
      <Button variant="outline" onClick={onNew}>Send another request</Button>
    </div>
  );
}