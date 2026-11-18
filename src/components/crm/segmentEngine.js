import { subDays, endOfMonth, subMonths, format } from "date-fns";

/** Builds { clientId: lastActivityISO } from orders + catering events. */
export function buildActivityMap(orders = [], cateringEvents = []) {
  const map = {};
  const touch = (id, date) => {
    if (!id || !date) return;
    if (!map[id] || new Date(date) > new Date(map[id])) map[id] = date;
  };
  orders.forEach((o) => touch(o.customer_id, o.created_date));
  cateringEvents.forEach((e) => touch(e.client_id, e.event_date || e.created_date));
  return map;
}

/** Does one client match the criteria, evaluated as of `asOf` (defaults to now)? */
export function matchesSegment(client, criteria, activityMap, asOf = new Date()) {
  const c = criteria || {};

  if (c.client_source && client.client_source !== c.client_source) return false;
  if (c.status && client.status !== c.status) return false;
  if (c.loyalty_tier_name && client.loyalty_tier_name !== c.loyalty_tier_name) return false;

  if (c.owner_employee_id === "__none__") {
    if (client.owner_employee_id) return false;
  } else if (c.owner_employee_id && client.owner_employee_id !== c.owner_employee_id) {
    return false;
  }

  const spent = client.total_spent || 0;
  if (c.min_total_spent != null && spent < c.min_total_spent) return false;
  if (c.max_total_spent != null && spent > c.max_total_spent) return false;
  if (c.min_visits != null && (client.visits_count || 0) < c.min_visits) return false;

  const created = new Date(client.created_date);
  if (created > asOf) return false;

  if (c.registered_within_days != null) {
    if (created < subDays(asOf, c.registered_within_days)) return false;
  }

  if (c.dormant_days != null) {
    const last = activityMap[client.id] ? new Date(activityMap[client.id]) : null;
    const lastBeforeAsOf = last && last <= asOf ? last : null;
    if (lastBeforeAsOf && lastBeforeAsOf >= subDays(asOf, c.dormant_days)) return false;
  }

  return true;
}

export function filterClients(clients, criteria, activityMap, asOf) {
  return clients.filter((cl) => matchesSegment(cl, criteria, activityMap, asOf));
}

/**
 * Trend is only honest for time-based criteria (dormancy / registration window),
 * because spend and tier are current snapshots with no history stored.
 */
export function supportsTrend(criteria) {
  return criteria?.dormant_days != null || criteria?.registered_within_days != null;
}

export function buildTrend(clients, criteria, activityMap, months = 6) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const monthDate = subMonths(now, months - 1 - i);
    const asOf = i === months - 1 ? now : endOfMonth(monthDate);
    return {
      month: format(monthDate, "MMM yy"),
      count: filterClients(clients, criteria, activityMap, asOf).length,
    };
  });
}

export const EMPTY_CRITERIA = {
  min_total_spent: null,
  max_total_spent: null,
  min_visits: null,
  dormant_days: null,
  registered_within_days: null,
  client_source: "",
  status: "",
  loyalty_tier_name: "",
  owner_employee_id: "",
  owner_filter_name: "",
};

export function criteriaOf(segment) {
  return {
    min_total_spent: segment.min_total_spent ?? null,
    max_total_spent: segment.max_total_spent ?? null,
    min_visits: segment.min_visits ?? null,
    dormant_days: segment.dormant_days ?? null,
    registered_within_days: segment.registered_within_days ?? null,
    client_source: segment.client_source || "",
    status: segment.status || "",
    loyalty_tier_name: segment.loyalty_tier_name || "",
    owner_employee_id: segment.owner_employee_id || "",
    owner_filter_name: segment.owner_filter_name || "",
  };
}

export function describeCriteria(c) {
  const parts = [];
  if (c.min_total_spent != null) parts.push(`spent ≥ ${c.min_total_spent}`);
  if (c.max_total_spent != null) parts.push(`spent ≤ ${c.max_total_spent}`);
  if (c.min_visits != null) parts.push(`${c.min_visits}+ visits`);
  if (c.dormant_days != null) parts.push(`no activity ${c.dormant_days}+ days`);
  if (c.registered_within_days != null) parts.push(`registered last ${c.registered_within_days} days`);
  if (c.client_source) parts.push(`source: ${c.client_source}`);
  if (c.status) parts.push(`status: ${c.status}`);
  if (c.loyalty_tier_name) parts.push(`tier: ${c.loyalty_tier_name}`);
  if (c.owner_employee_id === "__none__") parts.push("no owner assigned");
  else if (c.owner_employee_id) parts.push(`owner: ${c.owner_filter_name || "assigned"}`);
  return parts.length ? parts.join(" · ") : "All clients";
}