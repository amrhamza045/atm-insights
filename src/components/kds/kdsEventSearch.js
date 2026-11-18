// Text shown on an event card, so search matches what staff can see.
const cardText = (g) => [
  g.name, g.date,
  ...g.production.flatMap((o) => [`${o.target_quantity}×`, o.output_item_name || o.recipe_name, o.status?.replace("_", " ")]),
  ...g.slips.flatMap((s) => [s.slip_number, `${s.lines?.length || 0} line(s)`, s.status, s.shortfall_count > 0 && `${s.shortfall_count} shortfall(s)`]),
].filter(Boolean).join(" ").toLowerCase();

const slipRank = (g) => (g.slips.some((s) => s.shortfall_count > 0) ? 0 : g.slips.length ? 1 : 2);

const SORTERS = {
  date_asc: (a, b) => (a.date || "").localeCompare(b.date || ""),
  date_desc: (a, b) => (b.date || "").localeCompare(a.date || ""),
  name: (a, b) => (a.name || "").localeCompare(b.name || ""),
  slip_status: (a, b) => slipRank(a) - slipRank(b) || (a.date || "").localeCompare(b.date || ""),
};

export const SORT_OPTIONS = [
  { key: "date_asc", label: "Date (earliest)" },
  { key: "date_desc", label: "Date (latest)" },
  { key: "name", label: "Event name" },
  { key: "slip_status", label: "Release-slip status" },
];

export function searchAndSort(groups, search, sort) {
  const q = search.trim().toLowerCase();
  return groups.filter((g) => !q || cardText(g).includes(q)).sort(SORTERS[sort]);
}