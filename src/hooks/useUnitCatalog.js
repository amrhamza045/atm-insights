import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { registerUnitCatalog, normalizeUnit, getUnitMeta } from "@/lib/unitConversion";

/**
 * Shared hook that loads the managed Unit Table (UnitDefinition) and merges it
 * with standard units so Inventory, Manufacturing, KDS, Purchasing, and Unit
 * Conversions share one canonical unit catalog and alias map.
 */
export function useUnitCatalog() {
  const { data: unitDefinitions = [], isLoading } = useQuery({
    queryKey: ["unitDefinitions"],
    queryFn: async () => {
      try {
        if (!base44.entities.UnitDefinition) return [];
        return await base44.entities.UnitDefinition.list("canonical_label", 500);
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const catalogUnits = useMemo(
    () => registerUnitCatalog(unitDefinitions),
    [unitDefinitions]
  );

  const activeUnits = useMemo(
    () => catalogUnits.filter((u) => u.is_active !== false),
    [catalogUnits]
  );

  return {
    unitDefinitions,
    catalogUnits,
    activeUnits,
    isLoading,
    normalizeUnit,
    getUnitMeta,
  };
}