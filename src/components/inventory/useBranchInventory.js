import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useBranch } from "@/components/branches/BranchContext";

// Stock items of the branch picked in the header (every branch until one is picked).
// The stock screens share this so they read the same cached list.
export default function useBranchInventory() {
  const { selectedBranchId } = useBranch();
  return useQuery({
    queryKey: ["inventoryItems", selectedBranchId],
    queryFn: () => base44.entities.InventoryItem.filter(selectedBranchId ? { branch_id: selectedBranchId } : {}, "name"),
  });
}