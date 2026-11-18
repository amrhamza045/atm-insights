import useAutoApproveSetting from "@/components/approvals/useAutoApproveSetting";
import { useOptionalPermissions } from "@/components/permissions/PermissionsContext";

export const SELF_APPROVAL_KEY = "approval_self_bypass";

// "Self-approve (skip second approver)" — assigned through a role or user override only;
// admin status never grants it. The server makes the final decision.
export function useSelfApprovalBypass() {
  const assigned = useOptionalPermissions()?.assigned;
  return assigned?.access_denied !== true && assigned?.[SELF_APPROVAL_KEY] === true;
}

// Own catering payments may be decided by their submitter when the global switch is on or they hold Self-approve.
export default function useSelfApprovalOpen() {
  const { enabled } = useAutoApproveSetting();
  const bypass = useSelfApprovalBypass();
  return enabled || bypass;
}