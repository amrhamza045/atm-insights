// Quick-pick windows for the inventory duration filter.
const iso = (d) => d.toISOString().slice(0, 10);

const backDays = (n) => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (n - 1));
  return { from: iso(from), to: iso(to) };
};

export const INVENTORY_PRESETS = [
  { label: "7d", build: () => backDays(7) },
  { label: "30d", build: () => backDays(30) },
  {
    label: "This month",
    build: () => {
      const now = new Date();
      return { from: `${iso(now).slice(0, 7)}-01`, to: iso(now) };
    },
  },
  {
    label: "This year",
    build: () => {
      const now = new Date();
      return { from: `${now.getFullYear()}-01-01`, to: iso(now) };
    },
  },
];