import { CalendarDays, CreditCard, UserCog, Bug, HelpCircle } from "lucide-react";

// Topic keys must match the support-request function's list.
export const SUPPORT_TOPICS = [
  { key: "booking", label: "Booking or event", hint: "Dates, guests, menus or quotes", icon: CalendarDays },
  { key: "payment", label: "Payment or receipt", hint: "Deposits, balances, receipts", icon: CreditCard },
  { key: "account", label: "Account or login", hint: "Signing in, profile details", icon: UserCog },
  { key: "app", label: "App problem", hint: "Something isn't working", icon: Bug },
  { key: "other", label: "Something else", hint: "Any other question", icon: HelpCircle },
];

export const topicLabel = (key) => SUPPORT_TOPICS.find((t) => t.key === key)?.label || "";