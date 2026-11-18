// Sort a report's full result set by one column, ascending or descending.
// `columns` maps a sort key to a value getter; text compares by locale, the
// rest numerically. Ties fall back to `nameOf` so pages stay stable.
export function sortRows(rows, columns, { sort, dir }, fallback, nameOf) {
  const key = columns[sort] ? sort : fallback;
  const get = columns[key], sign = dir === 'asc' ? 1 : dir === 'desc' ? -1 : (key === 'name' ? 1 : -1);
  const cmp = (a, b) => {
    const x = get(a), y = get(b);
    const c = typeof x === 'string' || typeof y === 'string' ? String(x || '').localeCompare(String(y || '')) : (Number(x) || 0) - (Number(y) || 0);
    return c * sign || String(nameOf(a)).localeCompare(String(nameOf(b)));
  };
  return [...rows].sort(cmp);
}