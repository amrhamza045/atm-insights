import { companyToday, getTimezoneOffset } from "@/components/utils/timezoneHelper";

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const temp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = temp;
    }
  }
  return dp[a.length];
}

function isSubsequence(needle, haystack) {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (needle[i] === haystack[j]) i++;
  }
  return i === needle.length;
}

const MONTH_INDEX = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

export function toCaseInsensitiveRegex(term) {
  return String(term || "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/[a-zA-Z]/g, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`);
}

export function parseDateSearchHint(search) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return null;
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(q)) return q;
  const slashMatch = q.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const tokens = q.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const mNum = MONTH_INDEX[tokens[i]];
    if (mNum) {
      const next = tokens[i + 1]?.replace(/\D/g, "");
      const prev = tokens[i - 1]?.replace(/\D/g, "");
      const day = next || prev;
      if (day && Number(day) >= 1 && Number(day) <= 31) {
        return `-${mNum}-${String(Number(day)).padStart(2, "0")}`;
      }
      return `-${mNum}-`;
    }
  }
  return null;
}

export function formatDateVariants(dateStr) {
  if (!dateStr) return "";
  const clean = String(dateStr).slice(0, 10);
  const [y, m, d] = clean.split("-");
  if (!y || !m || !d) return clean;
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const mName = months[Number(m) - 1] || "";
  const mShort = mName.slice(0, 3);
  const dNum = String(Number(d));
  return `${clean} ${d}/${m}/${y} ${m}/${d}/${y} ${d}-${m}-${y} ${mName} ${dNum} ${mShort} ${dNum} ${dNum} ${mName} ${dNum} ${mShort} ${y}`;
}

export function fuzzyMatchText(query, ...fields) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  const combined = fields.filter(Boolean).join(" ").toLowerCase();
  if (combined.includes(q)) return true;

  const qTokens = q.split(/\s+/).filter(Boolean);
  const targetTokens = combined.split(/[\s,./\-_]+/).filter(Boolean);

  return qTokens.every((qt) => {
    if (combined.includes(qt)) return true;
    return targetTokens.some((tt) => {
      if (tt.includes(qt) || qt.includes(tt)) return true;
      if (qt.length >= 3 && isSubsequence(qt, tt)) return true;
      const maxDist = qt.length >= 6 ? 2 : qt.length >= 3 ? 1 : 0;
      return maxDist > 0 && Math.abs(qt.length - tt.length) <= maxDist && levenshtein(qt, tt) <= maxDist;
    });
  });
}

export function getCompanyDateBounds() {
  const today = companyToday();
  const [y, m, d] = today.split("-").map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = cur.getUTCDay(); // 0 = Sun
  const weekStartObj = new Date(cur);
  weekStartObj.setUTCDate(cur.getUTCDate() - dayOfWeek);
  const weekEndObj = new Date(weekStartObj);
  weekEndObj.setUTCDate(weekStartObj.getUTCDate() + 6);

  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthEnd = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return {
    today,
    weekStart: weekStartObj.toISOString().slice(0, 10),
    weekEnd: weekEndObj.toISOString().slice(0, 10),
    monthStart,
    monthEnd,
  };
}

export function matchesQuickFilter(group, quickFilter, bounds) {
  if (!quickFilter || quickFilter === "all") return true;
  if (quickFilter === "regular_only") return group.isUnlinked;
  if (group.isUnlinked) return false;

  const date = group.eventDate || "";
  const status = group.eventStatus || "";
  const isCompletedEvent = status === "completed" || (date && date < bounds.today && status !== "cancelled");
  const isUpcomingEvent = status !== "completed" && status !== "cancelled" && (!date || date >= bounds.today);

  if (quickFilter === "today") return date === bounds.today;
  if (quickFilter === "this_week") return date >= bounds.weekStart && date <= bounds.weekEnd;
  if (quickFilter === "this_month") return date >= bounds.monthStart && date <= bounds.monthEnd;
  if (quickFilter === "upcoming_events") return isUpcomingEvent;
  if (quickFilter === "completed_events") return isCompletedEvent;
  return true;
}

export function buildEventGroups({ orders, eventsById, clientsById, filters, bounds }) {
  const {
    search = "",
    quickFilter = "all",
    batchStatus = "all",
    productionType = "all",
    recipeId = "all",
    eventStatus = "all",
    branchFilter = "all",
    dateFrom = "",
    dateTo = "",
  } = filters;

  const filteredOrders = orders.filter((o) => {
    if (branchFilter !== "all" && o.branch_id !== branchFilter) return false;
    if (batchStatus !== "all") {
      if (batchStatus === "active" && o.status !== "pending" && o.status !== "in_progress") return false;
      if (batchStatus !== "active" && o.status !== batchStatus) return false;
    }
    if (recipeId !== "all" && o.recipe_id !== recipeId) return false;
    if (productionType === "catering" && !o.catering_event_id && o.order_source !== "catering") return false;
    if (productionType === "regular" && (o.catering_event_id || o.order_source === "catering")) return false;
    if (productionType === "sub_recipe" && o.production_stage !== "sub_recipe" && !o.parent_production_order_id) return false;
    return true;
  });

  const groupMap = new Map();
  const unlinkedOrders = [];

  for (const order of filteredOrders) {
    const eventId = order.catering_event_id;
    if (!eventId) {
      unlinkedOrders.push(order);
      continue;
    }
    if (!groupMap.has(eventId)) {
      const ev = eventsById.get(eventId);
      const client = ev?.client_id ? clientsById.get(ev.client_id) : null;
      const eventDate = ev?.event_date || order.needed_by_date || "";
      const customerName = ev?.client_name || client?.name || "";
      groupMap.set(eventId, {
        key: eventId,
        isUnlinked: false,
        eventId,
        eventName: ev?.event_name || order.catering_event_name || "Catering Event",
        eventCode: ev?.event_code || "",
        eventDate,
        eventStatus: ev?.status || "",
        customerName,
        customerPhone: ev?.client_phone || client?.phone || "",
        guests: ev?.expected_guests || order.catering_guests || 0,
        branchName: ev?.branch_name || order.branch_name || "",
        orders: [],
      });
    }
    groupMap.get(eventId).orders.push(order);
  }

  for (const g of groupMap.values()) {
    const nonCancelled = g.orders.filter((o) => o.status !== "cancelled");
    const allBatchesCompleted =
      nonCancelled.length > 0 && nonCancelled.every((o) => o.status === "completed");
    const isDatePassed = Boolean(g.eventDate && bounds?.today && g.eventDate < bounds.today);
    const isCompleted = g.eventStatus === "completed" || allBatchesCompleted || (isDatePassed && g.eventStatus !== "cancelled");
    g.isCompleted = isCompleted;
    g.isDatePassed = isDatePassed;
    g.isPastCompleted = isDatePassed && isCompleted;
  }

  const eventGroups = Array.from(groupMap.values()).filter((g) => {
    if (eventStatus !== "all" && g.eventStatus !== eventStatus) return false;
    if (dateFrom && (!g.eventDate || g.eventDate < dateFrom)) return false;
    if (dateTo && (!g.eventDate || g.eventDate > dateTo)) return false;
    if (!matchesQuickFilter(g, quickFilter, bounds)) return false;
    if (search.trim()) {
      const dateText = formatDateVariants(g.eventDate);
      const groupMatches = fuzzyMatchText(
        search,
        g.eventName,
        g.eventCode,
        g.customerName,
        g.customerPhone,
        g.eventDate,
        dateText
      );
      if (groupMatches) return true;
      const matchingBatchOrders = g.orders.filter((o) =>
        fuzzyMatchText(search, o.recipe_name, o.output_item_name, o.needed_by_date, formatDateVariants(o.needed_by_date))
      );
      if (matchingBatchOrders.length > 0) {
        g.orders = matchingBatchOrders;
        return true;
      }
      return false;
    }
    return true;
  });

  const currentEventGroups = [];
  const pastCompletedEventGroups = [];

  for (const g of eventGroups) {
    if (g.isPastCompleted) {
      pastCompletedEventGroups.push(g);
    } else {
      currentEventGroups.push(g);
    }
  }

  currentEventGroups.sort((a, b) => {
    const da = a.eventDate || "9999-12-31";
    const db = b.eventDate || "9999-12-31";
    if (da !== db) return da.localeCompare(db);
    return (a.eventName || "").localeCompare(b.eventName || "");
  });

  pastCompletedEventGroups.sort((a, b) => {
    const da = a.eventDate || "0000-00-00";
    const db = b.eventDate || "0000-00-00";
    if (da !== db) return db.localeCompare(da);
    return (a.eventName || "").localeCompare(b.eventName || "");
  });

  const showUnlinked =
    (quickFilter === "all" || quickFilter === "regular_only") &&
    eventStatus === "all" &&
    !dateFrom &&
    !dateTo;

  const matchedUnlinked = showUnlinked
    ? unlinkedOrders.filter((o) =>
        !search.trim() ||
        fuzzyMatchText(
          search,
          "regular non-event unlinked",
          o.recipe_name,
          o.output_item_name,
          o.branch_name,
          o.notes,
          formatDateVariants(o.created_date?.slice(0, 10))
        )
      )
    : [];

  return {
    eventGroups: [...currentEventGroups, ...pastCompletedEventGroups],
    currentEventGroups,
    pastCompletedEventGroups,
    unlinkedOrders: matchedUnlinked,
  };
}