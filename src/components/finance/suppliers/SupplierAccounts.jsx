import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { supplierCall, money } from "@/components/finance/customers/customerAccountsApi";
import CustomerTotals from "@/components/finance/customers/CustomerTotals";
import CustomerToolbar from "@/components/finance/customers/CustomerToolbar";
import CustomerPager from "@/components/finance/customers/CustomerPager";
import SupplierTable from "./SupplierTable";
import SupplierDetailSheet from "./SupplierDetailSheet";
import { useReportSort, useSpringScroll } from "@/components/finance/customers/useReportSort";
import { SUPPLIER_FIELDS, saveSupplierStatementPdf } from "./supplierStatementPdf";

const SORTS = [["balance", "Highest remaining"], ["invoices", "Highest invoices"], ["payments", "Highest payments"], ["unposted", "Most not posted"], ["name", "Name A–Z"]];

// Finance › Reporting › Our Suppliers: every supplier's account from the posted supplier ledger.
export default function SupplierAccounts({ company, filters }) {
  const [search, setSearch] = useState("");
  const { sort, setSort, pick } = useReportSort();
  const { ref, scrollToTop } = useSpringScroll();
  const [balanceOnly, setBalanceOnly] = useState(false), [mismatchOnly, setMismatchOnly] = useState(false);
  const [page, setPage] = useState(1), [selected, setSelected] = useState(new Set()), [open, setOpen] = useState(null), [busy, setBusy] = useState(false);
  const term = useDebouncedValue(search, 350);
  useEffect(() => setPage(1), [term, sort.key, sort.dir, balanceOnly, mismatchOnly, filters.from, filters.to, filters.branch_id]);
  const goTo = (n) => { setPage(n); scrollToTop(); };
  const query = useQuery({
    queryKey: ["supplierStatements", company.id, filters, term, sort.key, sort.dir, balanceOnly, mismatchOnly, page],
    queryFn: () => supplierCall("list", company, filters, { search: term, sort: sort.key, dir: sort.dir, balanceOnly, mismatchOnly, page, pageSize: 20 }),
    placeholderData: keepPreviousData,
  });
  const d = query.data;
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePage = () => setSelected((s) => { const n = new Set(s), all = d.items.every((r) => n.has(r.supplier_id)); d.items.forEach((r) => (all ? n.delete(r.supplier_id) : n.add(r.supplier_id))); return n; });
  const exportPdf = async (ids) => {
    setBusy(true);
    try {
      const r = await supplierCall("export", company, filters, { supplier_ids: ids || [], search: ids ? "" : term, balanceOnly, mismatchOnly });
      await saveSupplierStatementPdf({ suppliers: r.suppliers, currency: r.currency, company: r.company, filters, title: r.suppliers.length === 1 ? `Supplier statement - ${r.suppliers[0].supplier_name}` : "Our Suppliers - account statements" });
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <section ref={ref} className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Our Suppliers</h3>
        <p className="text-sm text-muted-foreground">Every supplier, from posted supplier-account entries. Every figure follows the selected branch (or all branches of the company) and From/To dates; other branches' transactions never count.</p>
      </div>
      <CustomerTotals totals={d?.totals} count={d?.count} currency={d?.currency} fields={SUPPLIER_FIELDS} noun="supplier" />
      {d?.totals.mismatches > 0 && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {d.totals.mismatches} supplier(s) have {d.totals.unposted_count} Purchases invoice(s) in this scope ({money(d.totals.unposted_amount, d.currency)}) that are posted in Purchases but were never registered in the supplier account, so they are not included in the totals. This is a reconciliation gap, not a draft problem; register each invoice (with its real payment evidence) or enter an opening balance.
          <button type="button" className="ml-2 underline" onClick={() => setMismatchOnly(true)}>Show only these</button>
        </p>
      )}
      <CustomerToolbar search={search} onSearch={setSearch} sort={sort.key} onSort={pick} sorts={SORTS} placeholder="Search supplier name, contact, phone or email"
        toggles={[{ label: "With balance only", checked: balanceOnly, onChange: setBalanceOnly }, { label: "Not posted from Purchases", checked: mismatchOnly, onChange: setMismatchOnly }]}
        selectedCount={selected.size} onExportSelected={() => exportPdf([...selected])} onExportAll={() => exportPdf(null)} busy={busy} />
      {query.isPending && <p role="status" className="py-6 text-sm text-slate-500">Loading suppliers…</p>}
      {query.error && <p role="alert" className="text-sm text-red-600">{query.error.message}</p>}
      {d && !d.items.length && <p className="rounded-xl border bg-white p-6 text-center text-sm text-slate-500">No suppliers match these filters.</p>}
      {d?.items.length > 0 && <SupplierTable items={d.items} currency={d.currency} selected={selected} onToggle={toggle} onTogglePage={togglePage} onOpen={setOpen} sort={sort} onSort={setSort} />}
      {d && <CustomerPager page={d.page} pages={d.pages} onChange={goTo} />}
      <SupplierDetailSheet row={open} company={company} filters={filters} onClose={() => setOpen(null)} onExport={exportPdf} exporting={busy} />
    </section>
  );
}