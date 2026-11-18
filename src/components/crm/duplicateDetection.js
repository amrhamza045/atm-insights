// Duplicate client detection — read-only. Nothing here ever writes or merges.

export const normName = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const normEmail = (s) => String(s || "").trim().toLowerCase();
export const normPhone = (s) => {
  const d = String(s || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
};

// Placeholder names that are NOT evidence of the same person ("Unknown", "Ahmed" alone...).
const PLACEHOLDER_NAMES = ["unknown", "unknownunknown", "unk", "na", "guest", "walkin", "client", "customer", "test"];
const isWeakName = (raw) => {
  const n = normName(raw);
  if (!n || n.length < 6) return true;
  if (PLACEHOLDER_NAMES.includes(n)) return true;
  // Single-token first names (e.g. "Ahmed", "Mohamed") are far too common here to mean anything
  return String(raw || "").trim().split(/\s+/).filter(Boolean).length < 2;
};

/**
 * Returns candidate duplicate pairs, highest confidence first.
 * high   = exact phone or exact email match
 * medium = identical full name + a shared secondary signal (same source or same registration month)
 */
export function findDuplicatePairs(clients = []) {
  const live = clients.filter((c) => !c.is_merged);
  const pairs = new Map();

  const addPair = (a, b, reason) => {
    const key = [a.id, b.id].sort().join("|");
    const entry = pairs.get(key) || { id: key, a, b, reasons: new Set() };
    entry.reasons.add(reason);
    pairs.set(key, entry);
  };

  const group = (keyFn) => {
    const buckets = {};
    for (const c of live) {
      const k = keyFn(c);
      if (k) (buckets[k] = buckets[k] || []).push(c);
    }
    return Object.values(buckets).filter((g) => g.length > 1);
  };

  for (const g of group((c) => { const p = normPhone(c.phone); return p.length >= 8 ? p : ""; })) {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) addPair(g[i], g[j], "phone");
  }
  for (const g of group((c) => normEmail(c.email))) {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) addPair(g[i], g[j], "email");
  }
  for (const g of group((c) => (isWeakName(c.name) ? "" : normName(c.name)))) {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) addPair(g[i], g[j], "name");
  }

  const sameMonth = (a, b) => String(a.created_date || "").slice(0, 7) === String(b.created_date || "").slice(0, 7);

  const result = [];
  for (const entry of pairs.values()) {
    const reasons = [...entry.reasons];
    const strong = reasons.includes("phone") || reasons.includes("email");
    const secondary = entry.a.client_source === entry.b.client_source || sameMonth(entry.a, entry.b);
    if (!strong && !secondary) continue; // name alone with nothing else — too weak to surface
    result.push({ ...entry, reasons, confidence: strong ? "high" : "medium" });
  }

  const order = { high: 0, medium: 1 };
  result.sort((x, y) => order[x.confidence] - order[y.confidence] || String(x.a.name).localeCompare(String(y.a.name)));
  return result;
}

export function summarizePairs(pairs = []) {
  return {
    total: pairs.length,
    high: pairs.filter((p) => p.confidence === "high").length,
    medium: pairs.filter((p) => p.confidence === "medium").length
  };
}