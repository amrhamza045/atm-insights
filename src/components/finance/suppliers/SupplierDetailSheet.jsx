import { useQuery } from "@tanstack/react-query";
import AccountDetailOverlay from "@/components/finance/AccountDetailOverlay";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { supplierCall } from "@/components/finance/customers/customerAccountsApi";
import CustomerTotals from "@/components/finance/customers/CustomerTotals";
import SupplierReconcile from "./SupplierReconcile";
import SupplierLedgerTable from "./SupplierLedgerTable";
import { SUPPLIER_FIELDS } from "./supplierStatementPdf";

// A supplier's totals, reconciliation against Purchases and full ledger timeline.
export default function SupplierDetailSheet({ row, company, filters, onClose, onExport, exporting }) {
  const query = useQuery({
    queryKey: ["supplierStatement", company.id, row?.supplier_id, filters],
    queryFn: () => supplierCall("detail", company, filters, { supplier_id: row.supplier_id }),
    enabled: !!row,
  });
  const s = query.data?.supplier, currency = query.data?.currency;
  return (
    <AccountDetailOverlay open={!!row} title={row?.supplier_name} onClose={onClose}>
        {query.isPending && <p className="py-8 text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading account…</p>}
        {query.error && <p role="alert" className="py-6 text-sm text-red-600">{query.error.message}</p>}
        {s && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <span>{[s.phone, s.email].filter(Boolean).join(" · ") || "No contact details"}</span>
              <Button size="sm" variant="outline" disabled={exporting} onClick={() => onExport([s.supplier_id])}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Export PDF
              </Button>
            </div>
            <CustomerTotals totals={s} count={1} currency={currency} fields={SUPPLIER_FIELDS} noun="supplier" />
            <SupplierReconcile s={s} currency={currency} />
            <SupplierLedgerTable entries={s.entries} />
          </div>
        )}
    </AccountDetailOverlay>
  );
}