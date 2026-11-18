import { useEffect, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { customerCall } from "./customerAccountsApi";
import { saveCustomerStatementPdf } from "./customerStatementPdf";
import CustomerTotals from "./CustomerTotals";
import CustomerToolbar from "./CustomerToolbar";
import CustomerTable from "./CustomerTable";
import CustomerPager from "./CustomerPager";
import CustomerDetailSheet from "./CustomerDetailSheet";
import { useReportSort, useSpringScroll } from "./useReportSort";

// Finance › Reporting › Our Customers: customers with an accepted quote that has a deposit.
export default function CustomerAccounts({ company, filters }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState(""), [balanceOnly, setBalanceOnly] = useState(false);
  const { sort, setSort, pick } = useReportSort();
  const { ref, scrollToTop } = useSpringScroll();
  const [page, setPage] = useState(1), [selected, setSelected] = useState(new Set()), [open, setOpen] = useState(null), [busy, setBusy] = useState(false);
  const term = useDebouncedValue(search, 350);
  useEffect(() => setPage(1), [term, sort.key, sort.dir, balanceOnly, filters.from, filters.to, filters.branch_id]);
  const goTo = (n) => { setPage(n); scrollToTop(); };
  const query = useQuery({
    queryKey: ["customerAccounts", company.id, filters, term, sort.key, sort.dir, balanceOnly, page],
    queryFn: () => customerCall("list", company, filters, { search: term, sort: sort.key, dir: sort.dir, balanceOnly, page, pageSize: 20 }),
    placeholderData: keepPreviousData,
  });
  const d = query.data;
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePage = () => setSelected((s) => { const n = new Set(s), all = d.items.every((r) => n.has(r.client_id)); d.items.forEach((r) => (all ? n.delete(r.client_id) : n.add(r.client_id))); return n; });

  const run = async (work, done) => {
    setBusy(true);
    try { await work(); if (done) toast.success(done); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const exportPdf = (ids) => run(async () => {
    const r = await customerCall("export", company, filters, { client_ids: ids || [], search: ids ? "" : term });
    const accounts = balanceOnly && !ids ? r.accounts.filter((a) => Math.abs(a.balance) >= 0.01) : r.accounts;
    if (!accounts.length) throw new Error("No customers to export.");
    await saveCustomerStatementPdf({ accounts, currency: r.currency, company: r.company, filters, title: accounts.length === 1 ? `Account statement - ${accounts[0].client_name}` : "Our Customers - account statements" });
  });
  const rebuild = () => run(async () => { await customerCall("rebuild", company, filters); await qc.invalidateQueries({ queryKey: ["customerAccounts"] }); }, "Customer accounts rebuilt.");

  return (
    <section ref={ref} className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Our Customers</h3>
        <p className="text-sm text-muted-foreground">Customers with an accepted quotation that has a deposit. The From/To dates above count only quotations and payments dated in that range.</p>
      </div>
      <CustomerTotals totals={d?.totals} count={d?.count} currency={d?.currency} />
      <CustomerToolbar search={search} onSearch={setSearch} sort={sort.key} onSort={pick} balanceOnly={balanceOnly} onBalanceOnly={setBalanceOnly}
        selectedCount={selected.size} onExportSelected={() => exportPdf([...selected])} onExportAll={() => exportPdf(null)} onRebuild={rebuild} busy={busy} />
      {query.isPending && <p role="status" className="py-6 text-sm text-slate-500">Loading customers…</p>}
      {query.error && <p role="alert" className="text-sm text-red-600">{query.error.message}</p>}
      {d && !d.items.length && <p className="rounded-xl border bg-white p-6 text-center text-sm text-slate-500">No customers with a deposit match these filters.</p>}
      {d?.items.length > 0 && <CustomerTable items={d.items} currency={d.currency} selected={selected} onToggle={toggle} onTogglePage={togglePage} onOpen={setOpen} sort={sort} onSort={setSort} />}
      {d && <CustomerPager page={d.page} pages={d.pages} onChange={goTo} />}
      <CustomerDetailSheet client={open} company={company} filters={filters} onClose={() => setOpen(null)} onExport={exportPdf} exporting={busy} />
    </section>
  );
}