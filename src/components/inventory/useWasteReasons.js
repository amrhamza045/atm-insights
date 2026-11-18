import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { WASTE_GROUPS } from '@/components/finance/wasteReasons/wasteGroups';

const BUILT_IN = Object.entries(WASTE_GROUPS).map(([code, name]) => ({ id: '', code, name, reason_group: code }));

// Configured reasons for the branch's company; the built-in six until any are set up.
export default function useWasteReasons(branchId) {
  const query = useQuery({
    queryKey: ['wasteReasons', branchId],
    queryFn: async () => (await base44.functions.invoke('listWasteReasons', { branch_id: branchId })).data.items,
    enabled: !!branchId,
  });
  const configured = query.data || [];
  return { reasons: configured.length ? configured : BUILT_IN, configured: configured.length > 0, isLoading: query.isLoading };
}