// Recipient choices for one email: { include_default, employee_ids, extra_emails }.
export const normalizeRecipients = (r) => ({
  include_default: r?.include_default !== false,
  employee_ids: r?.employee_ids || [],
  extra_emails: r?.extra_emails || [],
});

export const sameRecipients = (a, b) => JSON.stringify(normalizeRecipients(a)) === JSON.stringify(normalizeRecipients(b));

export const isEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const usualList = (item, ctx) => {
  if (item.reach === "approvers") return ctx.reach?.approvers;
  if (item.reach === "operations") return ctx.reach?.operations;
  if (item.reach === "chef") return ctx.chef ? (ctx.chef.chef_selected && ctx.chef.email ? [{ name: ctx.chef.chef_name }] : []) : undefined;
  return null; // decided per email: the client, guest, customer or recorder
};

/** Who an email reaches with this choice, from the live staff lists (undefined lists = still loading). */
export function describeRecipients(item, choice, ctx) {
  const isClient = item.audience === "client";
  const includeUsual = isClient || choice.include_default;
  const usual = usualList(item, ctx);
  const chosen = choice.employee_ids.map((id) => ctx.employeeById.get(id)
    || (ctx.reach ? { id, name: "Removed employee", missing: true } : { id, name: "Loading…", pending: true }));
  const blocked = chosen.filter((e) => !e.pending && (e.missing || !e.active || !e.email));
  const added = chosen.length - blocked.length + choice.extra_emails.length;
  const reachesNoOne = includeUsual ? Array.isArray(usual) && usual.length === 0 && added === 0 : added === 0;
  return { isClient, includeUsual, usual, chosen, blocked, added, reachesNoOne };
}

export const blockedReason = (e) =>
  e.missing ? "This employee was removed, so they won't receive it"
    : !e.active ? "No longer active, so they won't receive it"
      : !e.email ? "No email on file, so they won't receive it" : "";