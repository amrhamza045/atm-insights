import { money } from "./customerAccountsApi";
import { esc, saveStatementPdf } from "@/components/finance/statementPdf";

// Customer account statements: one section per event, paged cleanly.
const COLUMNS = [{ label: "Date" }, { label: "Entry" }, { label: "Debit", right: true }, { label: "Credit", right: true }, { label: "Balance", right: true }];

function account(a, currency) {
  const due = a.upcoming?.length ? `<p style="margin:6px 0 0;font-size:11px">Due: ${a.upcoming.map((u) => `${esc(u.event_name)} by ${esc(u.due_date || "event date")} ${money(u.amount, currency)}`).join(" · ")}</p>` : "";
  return {
    headHtml: `<h2 style="margin:0;font-size:16px" dir="auto">${esc(a.client_name)}</h2><p style="margin:2px 0 6px;color:#64748b;font-size:11px">${esc([a.client_phone, a.client_email].filter(Boolean).join(" · "))}</p><p style="font-size:12px;margin:0">Quotation ${money(a.total_quoted, currency)} · Paid ${money(a.total_paid, currency)} · <b>Remaining ${money(a.balance, currency)}</b></p>${due}`,
    sections: a.events.map((e) => {
      let run = 0;
      return {
        titleHtml: `${esc(e.event_name)}${e.event_date ? ` · event ${esc(e.event_date)}` : ""} · ${esc(e.event_status)}`,
        columns: COLUMNS,
        rows: e.entries.map((x) => { run += x.debit - x.credit; return [esc(x.date || ""), `${esc(x.label)}${x.reference ? ` · ${esc(x.reference)}` : ""}`, x.debit ? money(x.debit) : "", x.credit ? money(x.credit) : "", money(run)]; }),
      };
    }),
  };
}

export function saveCustomerStatementPdf({ accounts, currency, company, filters, title }) {
  const total = (k) => accounts.reduce((s, a) => s + a[k], 0);
  const range = filters.from || filters.to ? `${filters.from || "start"} to ${filters.to || "today"}` : "All dates";
  return saveStatementPdf({
    fileName: title,
    introHtml: `<h1 style="margin:0;font-size:20px">${esc(title)}</h1><p style="margin:4px 0;color:#64748b;font-size:11px">${esc(company)} · ${esc(range)} · printed ${new Date().toISOString().slice(0, 10)}</p><p style="font-size:13px;margin:8px 0 0">${accounts.length} customer(s) · Quotation ${money(total("total_quoted"), currency)} · Paid ${money(total("total_paid"), currency)} · <b>Remaining ${money(total("total_quoted") - total("total_paid"), currency)}</b></p>`,
    accounts: accounts.map((a) => account(a, currency)),
  });
}