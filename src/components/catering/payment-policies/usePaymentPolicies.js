import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const KEY = ["catering-payment-policies"];

/** The saved payment policies, lowest booking window first, with save and delete. */
export function usePaymentPolicies() {
  const queryClient = useQueryClient();
  const { data: policies = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () => base44.entities.CateringPaymentPolicy.list("min_days_before", 200),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  const save = async (id, data) => {
    if (id) await base44.entities.CateringPaymentPolicy.update(id, data);
    else await base44.entities.CateringPaymentPolicy.create(data);
    await refresh();
  };

  const remove = async (id) => {
    await base44.entities.CateringPaymentPolicy.delete(id);
    await refresh();
  };

  return { policies, isLoading, save, remove };
}