import { logAdminAction } from "@/components/utils/auditLogHelper";

// Fields that are recalculated automatically — not worth listing as "changes".
const IGNORED = new Set(["reschedule_history", "updated_date", "created_date"]);

/** Before/after for fields a person actually changed. */
export function diffEvent(before = {}, after = {}) {
  const changes = {};
  Object.keys(after).forEach((k) => {
    if (IGNORED.has(k)) return;
    const a = before[k] ?? null;
    const b = after[k] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) changes[k] = { from: a, to: b };
  });
  return changes;
}

/** Fire-and-forget audit entry for a catering event action. */
export function logEventAudit(actionType, event, description, changes = null) {
  return logAdminAction(actionType, "CateringEvent", description, {
    entityId: event?.id || null,
    entityName: event?.event_name || event?.name || null,
    changes,
  });
}