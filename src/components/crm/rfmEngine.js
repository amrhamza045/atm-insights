import { differenceInDays } from "date-fns";

// PROVISIONAL thresholds — pending owner approval. Scores are computed live
// from source records and never written to Client, so changing these
// reclassifies everyone instantly.
export const RFM_THRESHOLDS = {
  new_client_days: 60,     // registered within → "New"
  recent_days: 30,         // last activity within → fully current
  active_days: 90,         // last activity within → still active
  champion_min_visits: 8,
  champion_min_spent: 1500,
  loyal_min_visits: 3,
  at_risk_min_spent: 1500, // dormant but previously spent this much → At Risk, not Lost
};

export const HEALTH_META = {
  Champion: { color: "bg-emerald-100 text-emerald-800", order: 1 },
  Loyal: { color: "bg-blue-100 text-blue-800", order: 2 },
  New: { color: "bg-violet-100 text-violet-800", order: 3 },
  Casual: { color: "bg-slate-100 text-slate-700", order: 4 },
  "At Risk": { color: "bg-warning-100 text-warning-800", order: 5 },
  Lost: { color: "bg-red-100 text-red-700", order: 6 },
  Unranked: { color: "bg-slate-100 text-slate-500", order: 7 },
};

/**
 * Computes Recency / Frequency / Monetary and a health label for one client.
 * Clients with recorded spend but no dated order/event fall back to their
 * registration date as last-known activity — conservative: it can only make
 * them look more dormant, never fresher.
 */
export function computeRfm(client, activityMap, orderCounts, asOf = new Date()) {
  const T = RFM_THRESHOLDS;
  const monetary = client.total_spent || 0;
  const frequency = Math.max(client.visits_count || 0, orderCounts[client.id] || 0);
  const lastRaw = activityMap[client.id];
  const last = lastRaw
    ? new Date(lastRaw)
    : monetary > 0 || frequency > 0
      ? new Date(client.created_date)
      : null;
  const recencyDays = last ? differenceInDays(asOf, last) : null;
  const tenureDays = differenceInDays(asOf, new Date(client.created_date));

  let label;
  if (recencyDays === null) label = "Unranked";
  else if (tenureDays <= T.new_client_days) label = "New";
  else if (recencyDays <= T.recent_days && frequency >= T.champion_min_visits && monetary >= T.champion_min_spent)
    label = "Champion";
  else if (recencyDays <= T.active_days && frequency >= T.loyal_min_visits) label = "Loyal";
  else if (recencyDays > T.active_days && (frequency >= T.loyal_min_visits || monetary >= T.at_risk_min_spent))
    label = "At Risk";
  else if (recencyDays > T.active_days) label = "Lost";
  else label = "Casual";

  return { label, recencyDays, frequency, monetary, tenureDays };
}

export function scoreAll(clients, activityMap, orderCounts) {
  const asOf = new Date();
  return clients.map((c) => ({ client: c, rfm: computeRfm(c, activityMap, orderCounts, asOf) }));
}

export function distributionOf(scored) {
  const dist = {};
  scored.forEach(({ rfm }) => { dist[rfm.label] = (dist[rfm.label] || 0) + 1; });
  return dist;
}