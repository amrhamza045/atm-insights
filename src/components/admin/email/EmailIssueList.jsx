import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

// Each issue links to its email (or to Recent activity for failures).
export default function EmailIssueList({ issues, checking, onIssue }) {
  if (checking && !issues.length) {
    return <p className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Checking who receives each email…</p>;
  }
  if (!issues.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-700">
        <CheckCircle2 className="h-5 w-5 shrink-0" />Every switched-on email has someone to receive it, and nothing failed in the last 30 days.
      </p>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" />{issues.length} thing{issues.length === 1 ? "" : "s"} to check
      </p>
      <ul className="space-y-1.5">
        {issues.map((issue) => (
          <li key={`${issue.key}-${issue.kind}`} className="text-sm text-amber-900">
            <button type="button" onClick={() => onIssue(issue)} className="font-medium underline underline-offset-2 hover:text-amber-950">
              {issue.label}
            </button>{" "}{issue.text}
          </li>
        ))}
      </ul>
    </div>
  );
}