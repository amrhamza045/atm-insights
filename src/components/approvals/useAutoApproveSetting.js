import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const APPROVAL_SETTINGS_KEY = "approval_settings";

// The global "auto-approve when the requester holds the approval permission" switch.
export default function useAutoApproveSetting() {
  const query = useQuery({
    queryKey: ["approvalSettings"],
    queryFn: async () => (await base44.entities.SystemSettings.filter({ setting_key: APPROVAL_SETTINGS_KEY }))[0] || null,
  });
  return { record: query.data || null, enabled: query.data?.auto_approve_with_permission === true, isLoading: query.isLoading };
}