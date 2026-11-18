import { resolveAssignedPermissions } from './resolveEffectivePermissions.js';

/**
 * In-app requisition notifications. Recipients come only from assigned permission flags
 * (Roles tab + per-user overrides, resolveAssignedPermissions: no role-name, user, email or admin-status checks)
 * and the requisition's branch (a user with no branch covers every branch). The actor is never notified.
 * notifyRequisition never throws: a failure is logged with the requisition and event IDs and the action stands.
 */

const norm = (email) => String(email || '').toLowerCase().trim();

export const SIDE_FLAG = { chef: 'requisition_submit', inventory: 'requisition_respond' };
const SIDE_NAME = { chef: 'The chef', inventory: 'Inventory' };

/** The screen each flag's holders work a requisition in. */
export const FLAG_SCREEN = {
  requisition_submit: (id) => `/KitchenDisplay?requisition=${id}`,
  requisition_respond: (id) => `/InventoryManagement?tab=requested-items&requisition=${id}`,
  requisition_approve: (id) => `/Approvals?requisition=${id}#q-requisitions`,
};

/**
 * Trigger → recipient flags (in link order: a recipient's first held flag picks their screen), title, message.
 * x = trigger details passed by the caller.
 */
export const TRIGGERS = {
  submitted: { flags: () => ['requisition_respond'], title: () => 'Requisition submitted', message: () => 'The chef submitted the requisition. Your reply is needed.' },
  countered: { flags: () => ['requisition_respond'], title: () => 'Chef countered', message: () => 'The chef answered your reply with counters or new extra lines. Your decision is needed.' },
  replied: { flags: () => ['requisition_submit'], title: () => 'Inventory replied', message: () => 'Inventory replied to the requisition. Your response is needed.' },
  approval_requested: { flags: () => ['requisition_approve'], title: () => 'Approval needed', message: (x) => `Sent to approval: over the extra items limit${x.reason ? ` (${x.reason})` : ''}. Your decision is needed.` },
  approved: { flags: () => ['requisition_respond', 'requisition_submit'], title: () => 'Extra items approved', message: () => 'The approver approved the extra items. The requisition is with Inventory.' },
  rejected: { flags: () => ['requisition_submit'], title: () => 'Extra items rejected', message: (x) => `The approver rejected the extra items. Reason: ${x.reason}` },
  confirmed: { flags: () => ['requisition_respond', 'requisition_submit'], title: () => 'Requisition confirmed', message: () => 'Every line is agreed. Batch 1 is scheduled on the event date.' },
  split_proposed: { flags: (x) => [SIDE_FLAG[x.side === 'chef' ? 'inventory' : 'chef']], title: () => 'New batch plan proposed', message: (x) => `${SIDE_NAME[x.side]} proposed a new batch plan. Accept, decline or propose a different one.` },
  split_accepted: { flags: (x) => [SIDE_FLAG[x.proposerSide]], title: () => 'Batch plan accepted', message: (x) => `${SIDE_NAME[x.side]} accepted the proposed batch plan. The batches were updated.` },
  split_declined: { flags: (x) => [SIDE_FLAG[x.proposerSide]], title: () => 'Batch plan declined', message: (x) => `${SIDE_NAME[x.side]} declined the proposed batch plan. Reason: ${x.reason}` },
  split_withdrawn: { flags: (x) => [SIDE_FLAG[x.proposerSide]], title: () => 'Batch plan withdrawn', message: () => 'The batch plan proposal was withdrawn. The current plan stays.' },
  batch_released: { flags: () => ['requisition_submit'], title: (x) => `Batch ${x.batch} released — confirm receipt`, message: (x) => `Inventory released batch ${x.batch} (${x.slip}). Confirm receipt.` },
  batch_received: { flags: () => ['requisition_respond'], title: (x) => `Batch ${x.batch} received with a comment`, message: (x) => `The chef confirmed receipt of batch ${x.batch}: “${x.comment}”` },
  cancelled: { flags: () => ['requisition_submit', 'requisition_respond'], title: () => 'Requisition cancelled', message: (x) => `Cancelled by the system: ${x.reason}` },
};

/** Pure recipient rule: assigned flags, branch, actor excluded. Returns { recipients: [{ user_id, email, flag }], actorExcluded }. */
export function matchRecipients({ users, rows, roles }, requisition, flags, actorUserId) {
  const roleBy = new Map(roles.map((r) => [r.role_key, r]));
  const userBy = new Map(users.filter((u) => u.email).map((u) => [norm(u.email), u]));
  const found = new Map();
  let actorExcluded = false;
  for (const row of rows) {
    const user = userBy.get(norm(row.user_email));
    if (!user || found.has(user.id)) continue;
    const perms = resolveAssignedPermissions({ row, roleRecord: roleBy.get(row.role) || null });
    const canSeeRequisition = perms.requisition_view === true || perms.requisition_approve === true || perms.requisition_submit === true || perms.requisition_respond === true;
    if (perms.access_denied || !canSeeRequisition || (perms.branch_id && perms.branch_id !== requisition.branch_id)) continue;
    const flag = flags.find((f) => perms[f] === true);
    if (!flag) continue;
    if (user.id === actorUserId) { actorExcluded = true; continue; }
    found.set(user.id, { user_id: user.id, email: user.email, flag });
  }
  return { recipients: [...found.values()], actorExcluded };
}

/** Live permission sources for matchRecipients. Pass the service-role client. */
export async function loadRecipientSources(svc) {
  const [users, rows, roles] = await Promise.all([
    svc.entities.User.list('-created_date', 1000),
    svc.entities.UserPermissions.list('-created_date', 2000),
    svc.entities.Role.filter({ is_active: true }),
  ]);
  return { users, rows, roles };
}

/** Notification records for one trigger (title: REQ number + what happened; message: event name and date + details). */
export function buildNotifications(requisition, trigger, recipients, x = {}) {
  const t = TRIGGERS[trigger];
  const event = [requisition.event_name || 'Event', requisition.event_date || 'no date'].join(' · ');
  return recipients.map((r) => ({
    recipient_type: 'user', user_id: r.user_id, type: 'requisition', entity_type: 'requisition', entity_id: requisition.id,
    title: `${requisition.requisition_number}: ${t.title(x)}`, message: `${event} — ${t.message(x)}`,
    link_url: FLAG_SCREEN[r.flag](requisition.id), icon: 'ClipboardList', read: false,
  }));
}

/** Call after the action succeeded. Never throws. Returns { trigger, sent, actor_excluded } (or error). */
export async function notifyRequisition(svc, requisition, trigger, actor, x = {}) {
  try {
    const flags = TRIGGERS[trigger].flags(x);
    const { recipients, actorExcluded } = matchRecipients(await loadRecipientSources(svc), requisition, flags, actor?.actor_user_id);
    if (recipients.length) await svc.entities.Notification.bulkCreate(buildNotifications(requisition, trigger, recipients, x));
    return { trigger, sent: recipients.length, actor_excluded: actorExcluded };
  } catch (error) {
    console.error(`[requisition-notify] ${trigger} failed · requisition ${requisition?.id} · event ${requisition?.event_id}: ${error?.message || error}`);
    return { trigger, sent: 0, error: 'notification_failed' };
  }
}