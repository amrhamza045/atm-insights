import { getAssignedPermissions } from './resolveEffectivePermissions.js';
import { audit } from './auditLog.js';

// "Self-approve (skip second approver)": its holder may decide their own requests wherever a
// second person is normally required. Read from assigned flags only (role or user override), so
// admin status never grants it. The area's own approval permission is still checked by the caller.
export const SELF_APPROVAL_KEY = 'approval_self_bypass';

export async function holdsSelfApprovalBypass(svc, user) {
  if (!user?.email) return false;
  const assigned = await getAssignedPermissions({ asServiceRole: svc }, user);
  return assigned.access_denied !== true && assigned[SELF_APPROVAL_KEY] === true;
}

// Audit trail entry for a decision the holder made on their own item.
export function auditSelfApproval(svc, user, entityType, entityId, description) {
  return audit({ asServiceRole: svc }, user, 'approve', entityType, `Self-approved (no second approver): ${description}`,
    { entityId, changes: { self_approval: true } });
}