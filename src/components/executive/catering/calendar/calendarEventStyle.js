// Pure styling helpers for the catering event calendar.
// Status drives the chip fill (brand palette tokens), event type drives the left border.
import { eventPackageIdentity } from "../cateringPackageFilter";

// Status → brand token. The brand palette is injected on :root by applyBrandTheme,
// so reading the token at render keeps the calendar on-brand without hardcoded hex.
const BRAND_PRIMARY = { bg: "hsl(var(--primary))", fg: "hsl(var(--primary-foreground))" };
const BRAND_SECONDARY = { bg: "hsl(var(--secondary))", fg: "hsl(var(--secondary-foreground))" };
const BRAND_ACCENT = { bg: "hsl(var(--accent))", fg: "hsl(var(--accent-foreground))" };

const STATUS_STYLE = {
  confirmed: BRAND_PRIMARY,
  in_progress: BRAND_PRIMARY,
  completed: BRAND_SECONDARY,
  enquiry: BRAND_ACCENT,
  quoted: BRAND_ACCENT,
  deposit_pending: BRAND_ACCENT,
  deposit_pending_verification: BRAND_ACCENT,
};

const CANCELLED = { bg: "hsl(215 20% 92%)", fg: "hsl(215 16% 40%)" };

export function isCancelled(event) {
  return String(event?.status || "").toLowerCase() === "cancelled";
}

export function statusChipStyle(event) {
  if (isCancelled(event)) return CANCELLED;
  const key = String(event?.status || "").toLowerCase();
  return STATUS_STYLE[key] || { bg: "hsl(215 25% 27%)", fg: "hsl(0 0% 100%)" };
}

// Deterministic left-border color per event type, so the same category always
// reads the same way without competing with the status fill.
const TYPE_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#eab308",
  "#6366f1",
  "#22c55e",
];

export function eventTypeColor(event, quoteById) {
  const { category } = eventPackageIdentity(event, quoteById);
  let hash = 0;
  const text = String(category || "");
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  return TYPE_COLORS[hash % TYPE_COLORS.length];
}

export function eventTypeLabel(event, quoteById) {
  const { category, packageName } = eventPackageIdentity(event, quoteById);
  return { category, packageName };
}

// Groups events into a { 'YYYY-MM-DD': [events] } map keyed on event_date.
export function groupEventsByDate(events = []) {
  const map = {};
  events.forEach((e) => {
    const key = String(e?.event_date || "").slice(0, 10);
    if (!key) return;
    map[key] = map[key] || [];
    map[key].push(e);
  });
  Object.values(map).forEach((list) =>
    list.sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")))
  );
  return map;
}