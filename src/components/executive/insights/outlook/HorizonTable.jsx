import ReportCard from "@/components/executive/kit/ReportCard";
import ListTable from "@/components/executive/kit/ListTable";
import { fmtMoney, fmtNumber } from "@/components/executive/kit/formatters";

const cell = (main, sub) => (
  <span className="block">
    <span className="block">{main}</span>
    {sub && <span className="block text-[11px] text-slate-400">{sub}</span>}
  </span>
);

// The next 30, 60 and 90 days side by side: one card for revenue and cash, one for workload.
export default function HorizonTable({ d }) {
  const c = d.currency, money = (v) => fmtMoney(v, c);
  const head = { key: "days", label: "Next", render: (r) => `${r.days} days (to ${r.to})` };
  const revenue = [
    head,
    { key: "booked_value", label: "Booked", render: (r) => cell(money(r.booked_value), `${fmtNumber(r.booked_events)} events`) },
    { key: "open_value", label: "Open enquiries & quotes", render: (r) => cell(money(r.open_value), `${fmtNumber(r.open_events)} events`) },
    { key: "expected_value", label: "Expected", render: (r) => cell(money(r.expected_value)) },
    { key: "last_year_value", label: "Same days last year", render: (r) => cell(money(r.last_year_value), `${fmtNumber(r.last_year_events)} events`) },
    { key: "cash_in", label: "Due from clients", render: (r) => cell(money(r.cash_in)) },
    ...(d.horizons[0].supplier_due != null ? [{ key: "supplier_due", label: "Due to suppliers", render: (r) => cell(money(r.supplier_due)) }] : []),
  ];
  const work = [
    head,
    { key: "guests", label: "Guests", render: (r) => fmtNumber(r.guests) },
    { key: "crew", label: "Crew needed", render: (r) => fmtNumber(r.crew) },
    { key: "crew_unfilled", label: "Slots unfilled", render: (r) => fmtNumber(r.crew_unfilled) },
    { key: "critical_unfilled", label: "Critical roles unfilled", render: (r) => fmtNumber(r.critical_unfilled) },
    { key: "stock_gap_events", label: "Events short of stock", render: (r) => fmtNumber(r.stock_gap_events) },
  ];
  const rate = d.rate.rate == null ? "no decided enquiries in the last 12 months, so open ones are left out" : `${d.rate.rate.toFixed(1)}% (${fmtNumber(d.rate.won)} booked, ${fmtNumber(d.rate.lost)} cancelled in the last 12 months)`;
  return (
    <>
      <ReportCard
        title="Revenue and cash ahead"
        subtitle={`Expected = booked + open × booking rate of ${rate}.`}
        info={{ title: "Revenue and cash ahead", calculation: "Booked: confirmed and in-progress events by event date, at their quote total. Open: enquiries, quotes and events awaiting deposit. Same days last year: completed events. Due from clients: what each event's saved payment policy asks for in the window (its whole balance by the event day without a policy), not counting what is already overdue. Due to suppliers: posted supplier invoices falling due in the window, less payments and returns.", source: "Catering events, payment policies and supplier accounts" }}
      >
        <ListTable rows={d.horizons} columns={revenue} currency={c} empty="No events ahead." />
      </ReportCard>
      <ReportCard
        title="Workload ahead"
        subtitle="Booked events only."
        info={{ title: "Workload ahead", calculation: "Guests, crew required and unfilled staffing slots, unfilled critical roles and events with open stock shortfalls, for confirmed and in-progress events.", source: "Catering events and staffing" }}
      >
        <ListTable rows={d.horizons} columns={work} empty="No events ahead." />
      </ReportCard>
    </>
  );
}