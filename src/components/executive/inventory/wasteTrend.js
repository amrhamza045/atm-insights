// Builds the waste-trend series for the inventory duration filter.
// Kept pure and separate so the date-bucketing rules are testable and the
// dashboard component stays readable.
//
// Rules:
//  - No active range -> last 30 days, daily.
//  - Window up to 62 days -> daily buckets (labelled MM-DD).
//  - Longer window -> monthly buckets (labelled YYYY-MM), so a multi-year
//    range stays readable and days from different years can never collide.

const iso = (d) => d.toISOString().slice(0, 10);

// Business date the waste occurred on. created_date is only the entry timestamp,
// kept as the fallback for rows created before waste_date existed.
const wasteDay = (w) => String(w?.waste_date || w?.created_date || "").slice(0, 10);

function earliestWasteDate(waste) {
  let min = "";
  for (const w of waste) {
    const d = wasteDay(w);
    if (d && (!min || d < min)) min = d;
  }
  return min;
}

// Open-ended sides arrive as sentinels (0000-01-01 / 9999-12-31).
function resolveBounds(range, waste) {
  const today = iso(new Date());
  const from = String(range?.from || "");
  const to = String(range?.to || "");

  const endIso = !to || to > today ? today : to;
  const openStart = !from || from < "1900-01-01";
  let startIso = openStart ? earliestWasteDate(waste) : from;

  if (!startIso || startIso > endIso) {
    const d = new Date(`${endIso}T00:00:00`);
    d.setDate(d.getDate() - 29);
    startIso = iso(d);
  }
  return { startIso, endIso };
}

export function buildWasteTrend(waste = [], range, active) {
  const { startIso, endIso } = active
    ? resolveBounds(range, waste)
    : (() => {
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 29);
        return { startIso: iso(start), endIso: iso(end) };
      })();

  const spanDays = Math.round(
    (new Date(`${endIso}T00:00:00`) - new Date(`${startIso}T00:00:00`)) / 86400000
  ) + 1;
  const monthly = spanDays > 62;

  const buckets = [];
  const byKey = {};
  const push = (key, label) => {
    const b = { key, date: label, cost: 0, count: 0 };
    buckets.push(b);
    byKey[key] = b;
  };

  if (monthly) {
    const cursor = new Date(`${startIso.slice(0, 7)}-01T00:00:00`);
    const endMonth = endIso.slice(0, 7);
    while (iso(cursor).slice(0, 7) <= endMonth && buckets.length < 240) {
      const key = iso(cursor).slice(0, 7);
      push(key, key);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const cursor = new Date(`${startIso}T00:00:00`);
    while (iso(cursor) <= endIso) {
      const key = iso(cursor);
      push(key, key.slice(5));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  waste.forEach((w) => {
    const d = wasteDay(w);
    if (!d) return;
    const b = byKey[monthly ? d.slice(0, 7) : d];
    if (!b) return;
    b.cost += w.cost_impact || 0;
    b.count += 1;
  });

  return buckets.map((b) => ({ date: b.date, cost: Math.round(b.cost), count: b.count }));
}