import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useUnitCatalog } from '@/hooks/useUnitCatalog';

export default function usePurchaseUnits() {
  const { activeUnits, isLoading: catalogLoading } = useUnitCatalog();
  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ['purchase-unit-rules'],
    queryFn: async () => {
      const records = [];
      let cursor;
      do {
        const page = await base44.entities.UnitConversionRule.list({ limit: 100, cursor });
        records.push(...page.items);
        cursor = page.has_more ? page.next_cursor : null;
      } while (cursor);
      return records;
    },
    staleTime: 30000,
  });
  return { catalog: activeUnits, rules, loading: catalogLoading || isLoading, error };
}