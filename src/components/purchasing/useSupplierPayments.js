import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export async function supplierPaymentCall(input) {
  const { data } = await base44.functions.invoke("recordSupplierPayment", input);
  if (data?.error) throw new Error(data.error);
  return data;
}

const EMPTY = { spent: 0, paid: 0, remaining: 0 };

// Branch-scoped Spent / Paid / Remaining per supplier, read from the same
// supplier ledger that invoice posting and supplier payments write to.
export function useSupplierTotals(branchId) {
  const q = useQuery({
    queryKey: ["supplierPayments", "totals", branchId],
    enabled: !!branchId,
    queryFn: () => supplierPaymentCall({ action: "totals", branch_id: branchId }),
  });
  const totals = q.data?.totals || {};
  return { totalsFor: (id) => totals[id] || EMPTY, isLoading: q.isLoading };
}

export function useSupplierPaymentHistory(branchId, supplierId) {
  const q = useQuery({
    queryKey: ["supplierPayments", "history", branchId, supplierId],
    enabled: !!branchId && !!supplierId,
    queryFn: () => supplierPaymentCall({ action: "history", branch_id: branchId, supplier_id: supplierId }),
  });
  return { payments: q.data?.payments || [], isLoading: q.isLoading };
}

export function useSupplierPayable(branchId, supplierId, enabled) {
  return useQuery({
    queryKey: ["supplierPayments", "payable", branchId, supplierId],
    enabled: !!enabled && !!branchId && !!supplierId,
    queryFn: () => supplierPaymentCall({ action: "payable", branch_id: branchId, supplier_id: supplierId }),
  });
}