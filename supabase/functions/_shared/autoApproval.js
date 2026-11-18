import { holdsSelfApprovalBypass } from './selfApprovalBypass.js';

// Global "auto-approve when the requester holds the approval permission" switch.
// Read with the service role; only the 'approval_settings' record counts.
export async function isAutoApproveOn(svc) {
  const rows = await svc.entities.SystemSettings.filter({ setting_key: 'approval_settings' });
  return rows[0]?.auto_approve_with_permission === true;
}

// Why a requester may decide their own request: 'switch' (the global switch is on) or 'bypass'
// (they hold Self-approve). Both need the request type's approval permission (central admins hold every one).
export async function selfApprovalReason(svc, central, permissions, approvalKey, user) {
  if (!central && (permissions?.access_denied || permissions?.[approvalKey] !== true)) return null;
  if (await isAutoApproveOn(svc)) return 'switch';
  return (await holdsSelfApprovalBypass(svc, user)) ? 'bypass' : null;
}

export async function canSelfApprove(svc, central, permissions, approvalKey, user) {
  return (await selfApprovalReason(svc, central, permissions, approvalKey, user)) !== null;
}