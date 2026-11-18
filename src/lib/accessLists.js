// Helpers for the closed-key lists (modules, tabs) the access editors change.
export const toggleIn = (list, key) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

// Close (closed = true) or open every key in `keys` at once.
export const setIn = (list, keys, closed) =>
  closed ? [...new Set([...list, ...keys])] : list.filter((k) => !keys.includes(k));