import { CheckCircle2, XCircle } from "lucide-react";

export default function TestResult({ result }) {
  return (
    <ul className="space-y-1 text-xs">
      {result.sent.map((email) => (
        <li key={email} className="flex items-center gap-1.5 text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span className="break-all">{email}</span>
        </li>
      ))}
      {result.failures.map((f) => (
        <li key={f.email} className="flex items-start gap-1.5 text-red-600">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="break-all">{f.email}: {f.error}</span>
        </li>
      ))}
    </ul>
  );
}