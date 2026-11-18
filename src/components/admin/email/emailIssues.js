import { EMAIL_ITEMS } from "./emailCatalog";
import { describeRecipients } from "./recipientChoice";

/** Problems with switched-on emails: no one to receive them, chosen people who can't, recent failures. */
export function emailIssues(values, recipients, ctx, stats) {
  const issues = [];
  for (const item of EMAIL_ITEMS) {
    if (!values[item.key]) continue;
    const add = (kind, text) => issues.push({ key: item.key, label: item.label, kind, text });
    if (!ctx.isLoading) {
      const d = describeRecipients(item, recipients[item.key], ctx);
      if (item.reach === "chef" && !ctx.chef?.chef_selected) add("reach", "No Head Chef is set, so the brief isn't sent.");
      else if (item.reach === "chef" && d.includeUsual && !ctx.chef?.email && !d.added) add("reach", `${ctx.chef.chef_name} has no email on file.`);
      else if (d.reachesNoOne) add("reach", "No one will receive it.");
      if (d.blocked.length) {
        add("blocked", `${d.blocked.length} chosen ${d.blocked.length === 1 ? "person" : "people"} can't receive it (no email, or no longer active).`);
      }
    }
    const failed = stats?.[item.key]?.failed;
    if (failed) add("failed", `${failed} email${failed === 1 ? "" : "s"} failed in the last 30 days.`);
  }
  return issues;
}