import { CalendarDays, CalendarClock, FileText, Wallet, ThumbsUp, Percent, Rocket, ChefHat, ClipboardList, ShoppingCart, Users, Wrench, Truck, Activity, PackageOpen, ClipboardCheck, MessageSquareHeart, UserPlus, QrCode, ShieldCheck, Settings, Package, Mail, Zap, HandCoins } from "lucide-react";

// Assets and Resources (formerly the "costs" tab under Settings) is its own
// screen in the Operations menu: /AssetsResources.

// Two-level nav: 5 parent groups, each with sub-tabs. Shared by the Catering
// page and the access lists in Admin (Modules, Roles and Users).
export const CATERING_GROUPS = [
  {
    key: "booking", label: "Booking", icon: CalendarDays,
    tabs: [
      // First in the row: leftmost in English, rightmost in Arabic (the row follows the page direction).
      { key: "quick", label: "Quick Actions", icon: Zap },
      { key: "events", label: "Events", icon: CalendarDays },
      { key: "calendar", label: "Calendar", icon: CalendarClock },
      { key: "quotes", label: "Quotes", icon: FileText },
      { key: "payments", label: "Deposits & Payments", icon: Wallet },
      { key: "discounts", label: "Discounts", icon: Percent, gate: "discounts" },
      { key: "pos", label: "Confirm & Start", icon: Rocket, gate: "pos" },
    ],
  },
  {
    key: "prep", label: "Planning & Prep", icon: ChefHat,
    tabs: [
      { key: "planning", label: "Planning", icon: ChefHat },
      { key: "release-slips", label: "Stock Release Slip Requisitions", icon: ClipboardList },
      { key: "shortfalls", label: "Shortfall Queue", icon: ShoppingCart },
      { key: "staffing", label: "Staffing", icon: Users },
      { key: "equipment", label: "Equipment", icon: Wrench },
      { key: "logistics", label: "Logistics", icon: Truck, gate: "logistics" },
    ],
  },
  {
    key: "eventday", label: "Event Day", icon: Activity,
    tabs: [
      { key: "execution", label: "Execution", icon: Activity },
      { key: "returned", label: "Returned", icon: PackageOpen },
      { key: "reconciliation", label: "Reconciliation", icon: ClipboardCheck },
      { key: "feedback", label: "Staff Feedback", icon: MessageSquareHeart, gate: "discounts" },
    ],
  },
  {
    key: "guests", label: "Guest Engagement", icon: UserPlus,
    tabs: [
      { key: "invi222", label: "Invitations", icon: QrCode },
      { key: "portal", label: "Portal Access", icon: ShieldCheck },
    ],
  },
  {
    key: "config", label: "Settings", icon: Settings,
    tabs: [
      { key: "settings", label: "Lists & Settings", icon: Settings },
      { key: "quote-settings", label: "Quote", icon: FileText },
      { key: "payment-policies", label: "Payment Policies", icon: HandCoins },
      { key: "packages", label: "Packages", icon: Package },
      { key: "mail", label: "Mail", icon: Mail },
    ],
  },
];

/** Address of a Catering tab, optionally scoped to one event. */
export const cateringUrl = (tab, eventId) => `/Catering?tab=${tab}${eventId ? `&event_id=${eventId}` : ""}`;