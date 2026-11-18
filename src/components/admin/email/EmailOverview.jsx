import { Card, CardContent } from "@/components/ui/card";
import { EMAIL_ITEMS } from "./emailCatalog";
import StatTile from "./StatTile";
import EmailIssueList from "./EmailIssueList";

export default function EmailOverview({ values, recipients, stats, issues, checking, onIssue }) {
  const onCount = EMAIL_ITEMS.filter((item) => values[item.key]).length;
  const added = EMAIL_ITEMS.reduce((n, item) => n + recipients[item.key].employee_ids.length + recipients[item.key].extra_emails.length, 0);
  const totals = Object.values(stats || {}).reduce((t, s) => ({ sent: t.sent + s.sent, failed: t.failed + s.failed }), { sent: 0, failed: 0 });

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Automatic emails on" value={`${onCount} of ${EMAIL_ITEMS.length}`} sub={onCount === EMAIL_ITEMS.length ? "All switched on" : `${EMAIL_ITEMS.length - onCount} switched off`} />
          <StatTile
            label="Sent in the last 30 days"
            value={stats ? totals.sent : "…"}
            sub={totals.failed ? `${totals.failed} failed` : "No failures"}
            tone={totals.failed ? "red" : "green"}
          />
          <StatTile label="People you added" value={added} sub="Across all emails" />
        </div>
        <EmailIssueList issues={issues} checking={checking} onIssue={onIssue} />
      </CardContent>
    </Card>
  );
}