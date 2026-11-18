/**
 * Server-side permission gate shared by every hardened backend function.
 *
 * Rules (deliberately simple, and identical everywhere):
 *  - No user            -> denied 401.
 *  - user.role==='admin'-> ALLOWED unconditionally. This is the lockout safety
 *                          valve: a malformed UserPermissions row must never be
 *                          able to lock the platform admin out of their own app.
 *  - otherwise          -> the caller's UserPermissions row must have at least
 *                          one of the requested flags set to true.
 *
 * The row is read with the service role because a regular app user is not
 * guaranteed to be able to read permission rows — we read it only to decide,
 * never to return it to the caller.
 */

import { getEffectivePermissions } from './resolveEffectivePermissions.js';
import { healIfDrifted } from './permissionCopySync.js';

/**
 * @param base44  client from createClientFromRequest(req)
 * @param user    result of await base44.auth.me()
 * @param flags   permission key, or array of keys (ANY match allows)
 * @returns {Promise<{allowed: boolean, status?: number, reason?: string}>}
 */
export async function checkPermission(base44, user, flags) {
  if (!user) return { allowed: false, status: 401, reason: 'Unauthorized' };
  // Layer 2 drift self-heal: fire-and-forget, throttled, never blocks the action.
  healIfDrifted(base44.asServiceRole, user).catch(() => {});
  // Platform admins pass, but still carry their resolved (all-granted) set so
  // downstream checks read permissions rather than the platform flag.
  if (user.role === 'admin') return { allowed: true, permissions: await getEffectivePermissions(base44, user) };

  const wanted = Array.isArray(flags) ? flags : [flags];
  const email = String(user.email || '').toLowerCase().trim();
  if (!email) return { allowed: false, status: 403, reason: 'Forbidden' };

  // Resolved live from the assigned Role + the caller's sparse overrides.
  const perms = await getEffectivePermissions(base44, user);

  if (!perms || perms.access_denied)
    return { allowed: false, status: 403, reason: 'Forbidden: no active staff permissions' };

  const ok = wanted.some((flag) => perms[flag] === true);
  if (!ok)
    return {
      allowed: false,
      status: 403,
      reason: `Forbidden: requires ${wanted.join(' or ')}`,
    };

  return { allowed: true, permissions: perms };
}

/**
 * Convenience wrapper: returns a Response to send back, or null when allowed.
 *   const denied = await denyUnlessPermitted(base44, user, 'purchase_edit');
 *   if (denied) return denied;
 */
export async function denyUnlessPermitted(base44, user, flags) {
  const result = await checkPermission(base44, user, flags);
  if (result.allowed) return null;
  return Response.json({ error: result.reason }, { status: result.status });
}