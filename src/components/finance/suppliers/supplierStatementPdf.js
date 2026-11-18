import { money } from "@/components/finance/customers/customerAccountsApi";
import { esc, saveStatementPdf } from "@/components/finance/statementPdf";

export const SUPPLIER_FIELDS = [["total_invoices", "Total invoices"], ["total_returns", "Supplier returns"], ["total_spent", "Total spent (invoices − returns)"], ["total_payments", "Cash payments"], ["balance", "Total remaining (balance)"]];
const COLUMNS = [{ label: "Date" }, { label: "Entry" }, { label: "Invoice (credit)", right: true }, { label: "Payment (debit)", right: true }, { label: "Balance", right: true }];

function account(s, currency) {
  const off = s.unposted_count > 0;
  let run = 0;
  return {
    headHtml: `<h2 style="margin:0;font-size:16px" dir="auto">${esc(s.supplier_name)}</h2><p style="margin:2px 0 6px;color:#64748b;font-size:11px">${esc([s.phone, s.email].filter(Boolean).join(" · "))}</p><p style="font-size:12px;margin:0">Invoices ${money(s.total_invoices, currency)} · Returns ${money(s.total_returns, currency)} · Total spent ${money(s.total_spent, currency)} · Cash payments ${money(s.total_payments, currency)} · <b>Remaining ${money(s.balance, currency)}</b></p><p style="font-size:11px;margin:4px 0 0;color:${off ? "#b91c1c" : "#64748b"}">${off ? `Purchases invoices not posted to this account: ${s.unposted_count} · ${money(s.unposted_amount, currency)} (not included above)` : "All Purchases invoices in this scope are posted"}</p>`,
    sections: [{
      titleHtml: "Supplier ledger",
      columns: COLUMNS,
      rows: s.entries.length ? s.entries.map((x) => { run += x.invoice - x.payment; return [esc(x.date), `${esc(x.label)}${x.reference ? ` · ${esc(x.reference)}` : ""}`, x.invoice ? money(x.invoice) : "", x.payment ? money(x.payment) : "", money(run)]; }) : [["", "No posted entries in these filters", "", "", ""]],
    }],
  };
}

export function saveSupplierStatementPdf({ suppliers, currency, company, filters, title }) {
  const total = (k) => suppliers.reduce((t, s) => t + s[k], 0);
  const range = filters.from || filters.to ? `${filters.from || "start"} to ${filters.to || "today"}` : "All dates";
  return saveStatementPdf({
    fileName: title,
    introHtml: `<h1 style="margin:0;font-size:20px">${esc(title)}</h1><p style="margin:4px 0;color:#64748b;font-size:11px">${esc(company)} · ${esc(range)} · printed ${new Date().toISOString().slice(0, 10)}</p><p style="font-size:13px;margin:8px 0 0">${suppliers.length} supplier(s) · Invoices ${money(total("total_invoices"), currency)} · Returns ${money(total("total_returns"), currency)} · Total spent ${money(total("total_spent"), currency)} · Cash payments ${money(total("total_payments"), currency)} · <b>Remaining ${money(total("balance"), currency)}</b></p>`,
    accounts: suppliers.map((s) => account(s, currency)),
  });
}