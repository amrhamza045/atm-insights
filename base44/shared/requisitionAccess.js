import { getAssignedPermissions } from './resolveEffectivePermissions.js';

/**
 * Permission-flag gate for a requisition action: the flag plus the requisition's branch.
 * Flags come only from the Roles tab and per-user overrides (getAssignedPermissions):
 * no role-name, role-key, user, email or admin-status checks — admin status grants nothing.
 * Returns null when allowed, else { status, error }.
 */
export function requisitionAccessError(permissions, requisition, flag) {
  if (!permissions || permissions.access_denied) return { status: 403, error: 'Forbidden: no active staff permissions' };
  if (permissions[flag] !== true) return { status: 403, error: `Forbidden: requires the ${flag} permission` };
  if (permissions.branch_id && permissions.branch_id !== requisition.branch_id)
    return { status: 403, error: 'Forbidden: this requisition belongs to another branch' };
  return null;
}

/** Caller + permissions + requisition for an action. Returns { denied: Response } or the context. */
export async function openRequisitionAction(base44, requisitionId, flag) {
  const user = await base44.auth.me();
  if (!user) return { denied: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!requisitionId) return { denied: Response.json({ error: 'requisition_id is required' }, { status: 400 }) };
  const permissions = await getAssignedPermissions(base44, user);
  if (permissions?.[flag] !== true) return { denied: Response.json({ error: `Forbidden: requires the ${flag} permission` }, { status: 403 }) };
  const svc = base44.asServiceRole;
  const requisition = await svc.entities.Requisition.get(requisitionId).catch(() => null);
  if (!requisition) return { denied: Response.json({ error: 'Requisition not found' }, { status: 404 }) };
  const denied = requisitionAccessError(permissions, requisition, flag);
  if (denied) return { denied: Response.json({ error: denied.error }, { status: denied.status }) };
  const actor = { actor_user_id: user.id, actor_name: user.full_name || user.email || '', actor_role: permissions.role || '' };
  return { user, svc, permissions, requisition, actor };
}

/**
 * Stale guard for chef / inventory responses: the caller sends the revision number it was looking at.
 * Returns a 409 Response when the requisition has moved past it (or no revision was sent), else null.
 */
export function staleResponse(requisition, revision) {
  const seen = revision === undefined || revision === null || revision === '' ? NaN : Number(revision);
  if (seen === (Number(requisition.current_revision) || 0)) return null;
  return Response.json({ error: 'This requisition was updated — please reload', code: 'stale', current_revision: Number(requisition.current_revision) || 0 }, { status: 409 });
}

/** Error responses for thrown errors that carry a status (e.g. a 409 from a guarded transition). */
export const errorResponse = (error) =>
  Response.json({ error: error.message, code: error.code || undefined }, { status: error.status || 500 });