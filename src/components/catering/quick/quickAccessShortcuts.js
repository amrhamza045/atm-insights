import {
  PlusCircle, CalendarDays, FileText, Wallet, Users, AlertCircle, ClipboardCheck, ShoppingCart,
  LayoutDashboard, TrendingUp, Coins, TrendingDown, CalendarCheck, Landmark, GitCompare, Bell,
} from "lucide-react";

// The Quick Actions shortcuts. `tab` opens that Catering tab (keeping the
// selected event); `newEvent` also starts the Events tab's New Event form;
// `page` opens another screen, `query` picks a report on it.
export const QUICK_SHORTCUTS = [
  { key: "new-event", label: "New Event", icon: PlusCircle, tab: "events", newEvent: true, hint: "Open Events and start a new catering event" },
  { key: "calendar", label: "Calendar", icon: CalendarDays, tab: "calendar", hint: "See scheduled events in calendar view" },
  { key: "quotes", label: "Quotes", icon: FileText, tab: "quotes", hint: "Review and manage quotations for the selected event" },
  { key: "deposits", label: "Deposits", icon: Wallet, tab: "payments", hint: "Review pending and received deposits for the selected event" },
  { key: "staffing", label: "Staffing", icon: Users, tab: "staffing", hint: "Review and manage staff assignments for the selected event" },
  { key: "shortfalls", label: "Shortfall Queue", icon: ShoppingCart, tab: "shortfalls", hint: "Materials still missing for upcoming events" },
  { key: "reconciliation", label: "Reconciliation", icon: ClipboardCheck, tab: "reconciliation", hint: "Final guest count, extra charges and amount owed for the selected event" },
  { key: "pending", label: "Pending Tasks", icon: AlertCircle, page: "Approvals", hint: "Open the Approvals Center: items waiting for action" },
  { key: "executive", label: "Executive Dashboard", icon: LayoutDashboard, page: "ExecutiveDashboard", hint: "360° business overview across all modules" },
  { key: "pipeline", label: "Bookings & Pipeline", icon: TrendingUp, page: "ExecutiveDashboard", query: "?tab=pipeline", hint: "Enquiries, bookings, cancellations and the pipeline ahead" },
  { key: "pnl", label: "Event P&L", icon: Coins, page: "ExecutiveDashboard", query: "?tab=catering", hint: "Catering revenue, costs and margin per event" },
  { key: "loss", label: "Loss Analysis", icon: TrendingDown, page: "ExecutiveDashboard", query: "?tab=lossanalysis", hint: "Events that lost money or missed their target margin" },
  { key: "daily", label: "Daily Report", icon: CalendarCheck, page: "ExecutiveDashboard", query: "?tab=vk360daily", hint: "Daily revenue and cost report" },
  { key: "finance", label: "Financial Reports", icon: Landmark, page: "Finance", hint: "Finance workspace: statements, ledger, tax and budgets" },
  { key: "branches", label: "Branch Comparison", icon: GitCompare, page: "ComparativeBranchReport", hint: "Compare branches side by side" },
  { key: "alerts", label: "Alerts Center", icon: Bell, page: "ExecutiveDashboard", query: "?tab=alerts", hint: "Business alerts that need the owner's attention" },
];