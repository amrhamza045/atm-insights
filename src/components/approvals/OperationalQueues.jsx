import { CalendarX, Wallet, ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import LinkQueue from "./LinkQueue";

// Queues whose action lives on another screen — listed here, finished there.
export const ExpiryQueue = ({ items }) => (
  <LinkQueue icon={CalendarX} title="Open Expiry Reports" items={items} to="/ExpiryReports" actionLabel="Resolve"
    renderLine={(r) => (<><span><span className="font-semibold">{r.inventory_item_name}</span> · {r.branch_name} · expires {r.expiry_date}</span><span className="font-bold">{formatCurrency(r.estimated_value || 0)}</span></>)} />
);

export const SessionsQueue = ({ items }) => (
  <LinkQueue icon={Wallet} title="Open Cashier Sessions" items={items} to="/Cashier" actionLabel="Close session"
    renderLine={(s) => (<><span><span className="font-semibold">{s.cashier_name}</span> · {s.branch_name} · opened {s.session_date}</span><span className="font-bold">{formatCurrency(s.total_sales || 0)}</span></>)} />
);

export const CustodyQueue = ({ items }) => (
  <LinkQueue icon={ShieldAlert} title="Custody Shortages" items={items} to="/Catering" actionLabel="Review"
    renderLine={(c) => (<><span><span className="font-semibold">{c.event_name}</span> · {c.stage}</span><span className="text-slate-600">{c.discrepancy_notes || c.reported_by_name}</span></>)} />
);