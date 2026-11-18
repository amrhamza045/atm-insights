import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// The fixed list offered before categories could be added; always available.
const BUILT_IN = ["Cooking", "Furniture", "Power", "Serving", "Decoration", "Shelter", "Transport", "Other"];

/**
 * Equipment category names for pickers: the built-in ones, every name already on an item,
 * and the categories staff added. `saved` holds the added category records.
 */
export function useEquipmentCategories() {
  // Under "catering-equipment" so every equipment save refreshes the names in use.
  const { data: inUse = [] } = useQuery({
    queryKey: ["catering-equipment", "category-names"],
    queryFn: async () => (await base44.entities.CateringEquipment.list({ distinct: "category" })).items || [],
  });
  const { data: saved = [] } = useQuery({
    queryKey: ["catering-equipment-categories"],
    queryFn: () => base44.entities.CateringEquipmentCategory.list("name", 200),
  });

  const options = useMemo(() => {
    const byKey = new Map();
    [...BUILT_IN, ...inUse, ...saved.map((c) => c.name)].forEach((value) => {
      const name = (value || "").trim();
      if (name && !byKey.has(name.toLowerCase())) byKey.set(name.toLowerCase(), name);
    });
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }, [inUse, saved]);

  return { options, saved, inUse };
}