import { isCentralAdmin } from './platformRole.js';
import { getEffectivePermissions } from './resolveEffectivePermissions.js';

/**
 * Resolves the acting user's branch authorization scope.
 *
 * Rules:
 *  - Platform admin (user.role === 'admin'), safety valve, or central admin
 *    (user.perm_is_central_admin || user.data?.perm_is_central_admin || permissions.users_manage)
 *    can access all branches (globalAccess = true).
 *  - If the user has an explicit branch lock (`perm_has_branch === true` or
 *    `permissions.branch_id` set), they can ONLY access that locked branch.
 *  - Ordinary staff users without a branch lock only access branches when
 *    explicitly allowed or when their effective permissions grant no lock.
 */
export function evaluateBranchAccess({ user, permissions, branches = [] }) {
  if (!user) {
    return {
      authenticated: false,
      globalAccess: false,
      lockedBranchId: null,
      authorizedBranchIds: [],
      authorizedBranches: [],
    };
  }

  const userField = (k) => user[k] ?? user.data?.[k];
  const central =
    isCentralAdmin(user, permissions) ||
    userField('perm_is_central_admin') === true ||
    permissions?.users_manage === true;

  const permBranchId =
    permissions?.branch_id ||
    (userField('perm_has_branch') === true ? userField('perm_branch_id') || '' : null);

  if (central) {
    const ids = branches.map((b) => b.id).filter(Boolean);
    return {
      authenticated: true,
      globalAccess: true,
      lockedBranchId: null,
      authorizedBranchIds: ids,
      authorizedBranches: branches,
    };
  }

  if (permBranchId !== null && permBranchId !== undefined) {
    const allowed = branches.filter((b) => b.id === permBranchId);
    return {
      authenticated: true,
      globalAccess: false,
      lockedBranchId: permBranchId,
      authorizedBranchIds: allowed.map((b) => b.id),
      authorizedBranches: allowed,
    };
  }

  // Staff member with no branch lock assigned in UserPermissions
  const ids = branches.map((b) => b.id).filter(Boolean);
  return {
    authenticated: true,
    globalAccess: true,
    lockedBranchId: null,
    authorizedBranchIds: ids,
    authorizedBranches: branches,
  };
}

/**
 * Verify whether the user is allowed to read/write in the given branchId.
 */
export function canUserAccessBranch(scope, branchId) {
  if (!scope?.authenticated) return false;
  if (!branchId) return scope.globalAccess === true;
  if (scope.globalAccess) return true;
  return scope.authorizedBranchIds.includes(branchId);
}

/**
 * Loads branches + effective permissions and resolves the user's branch scope.
 */
export async function loadUserBranchScope(base44, user, preloadedPermissions = null, preloadedBranches = null) {
  const svc = base44.asServiceRole;
  const [permissions, branches] = await Promise.all([
    preloadedPermissions ? Promise.resolve(preloadedPermissions) : getEffectivePermissions(base44, user),
    preloadedBranches ? Promise.resolve(preloadedBranches) : svc.entities.Branch.list('created_date', 200),
  ]);
  return evaluateBranchAccess({ user, permissions, branches });
}