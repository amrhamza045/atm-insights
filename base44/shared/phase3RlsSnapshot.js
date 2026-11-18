/**
 * SNAPSHOT (reference only — not imported anywhere) of the data rules on the
 * five catering entities BEFORE Phase 3, taken 2026-09-28. Rollback version: 8bba450.
 * To roll back one entity by hand: paste its block below back as the entity's "rls".
 */
const ADMIN = { user_condition: { role: 'admin' } };
const BRANCH_LIST = { 'data.branch_id': { $in: '{{user.data.catering_branch_ids}}' } };
const PORTAL = { 'data.client_id': '{{user.data.portal_client_id}}' };

export const PHASE3_RLS_BEFORE = {
  CateringEvent: {
    read: { $or: [ADMIN, BRANCH_LIST, PORTAL] },
    create: { $or: [ADMIN, BRANCH_LIST] },
    update: { $or: [ADMIN, BRANCH_LIST] },
    delete: { $or: [ADMIN, BRANCH_LIST] },
  },
  CateringActualCostRun: {
    read: { $or: [ADMIN, BRANCH_LIST] },
    create: ADMIN,
    update: ADMIN,
    delete: ADMIN,
  },
  CateringReconciliation: {
    read: { $or: [ADMIN, BRANCH_LIST, PORTAL] },
    create: { $or: [ADMIN, BRANCH_LIST] },
    update: { $or: [ADMIN, BRANCH_LIST] },
    delete: { $or: [ADMIN, BRANCH_LIST] },
  },
  CateringTransferProof: {
    read: { $or: [ADMIN, BRANCH_LIST, PORTAL] },
    create: { $or: [ADMIN, BRANCH_LIST, PORTAL] },
    update: { $or: [ADMIN, BRANCH_LIST] },
    delete: { $or: [ADMIN, BRANCH_LIST] },
  },
  CateringCustodyCheckpoint: {
    // read: open (no rule)
    create: { id: '__service_role_only__' },
    update: { id: '__service_role_only__' },
    delete: ADMIN,
  },
};