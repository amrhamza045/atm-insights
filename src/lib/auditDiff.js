// Compares a record before and after a save so the audit log names only what really changed.
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const blank = (v) => v === undefined || v === null || v === "" || v === false || v === 0 ||
  (Array.isArray(v) && !v.length) || (isObj(v) && !Object.keys(v).length);

export function same(a, b) {
  if (blank(a) && blank(b)) return true;
  if (isObj(a) && isObj(b)) return [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => same(a[k], b[k]));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (typeof a !== "object" && typeof b !== "object") return String(a) === String(b);
  return false;
}

const list = (key, parts) => (parts.length ? `${key} (${parts.slice(0, 12).join(", ")}${parts.length > 12 ? ", …" : ""})` : key);

/** "permissions (+finance_edit, -pos_view)" for switch maps and lists; otherwise just the field name. */
export function describeChange(key, before, after) {
  if (isObj(before) || isObj(after)) {
    const a = isObj(before) ? before : {}, b = isObj(after) ? after : {};
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !same(a[k], b[k]));
    return list(key, keys.map((k) => (typeof (b[k] ?? a[k]) === "boolean" ? `${b[k] ? "+" : "-"}${k}` : k)));
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    const a = Array.isArray(before) ? before : [], b = Array.isArray(after) ? after : [];
    if (![...a, ...b].every((x) => x === null || typeof x !== "object")) return key;
    return list(key, [...b.filter((x) => !a.includes(x)).map((x) => `+${x}`), ...a.filter((x) => !b.includes(x)).map((x) => `-${x}`)]);
  }
  return key;
}

export function short(v) {
  const s = typeof v === "object" && v !== null ? JSON.stringify(v) : v;
  return typeof s === "string" && s.length > 200 ? `${s.slice(0, 200)}…` : s ?? null;
}