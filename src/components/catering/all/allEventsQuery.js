import { companyToday } from "@/components/utils/timezoneHelper";

const escapeRegex = (term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Case-insensitive "contains" match on one text field, or on any of several; an empty term matches everything. */
export const textSearch = (fields, term) => {
  if (!term) return {};
  const match = (field) => ({ [field]: { $regex: escapeRegex(term), $options: "i" } });
  return Array.isArray(fields) ? { $or: fields.map(match) } : match(fields);
};

/** Timestamps from the start of `from` to the end of `to` (local calendar days); either end is optional. */
export const dateRange = (field, from, to) => {
  if (!from && !to) return {};
  return {
    [field]: {
      ...(from && { $gte: new Date(`${from}T00:00:00`).toISOString() }),
      ...(to && { $lte: new Date(`${to}T23:59:59.999`).toISOString() }),
    },
  };
};

export const WHEN_OPTIONS = [["upcoming", "Upcoming"], ["past", "Past"], ["all", "All dates"]];

/** Date window and order of an event-dated list: upcoming soonest first (today included); past and all dates newest first. */
export const whenQuery = (field, when) => {
  const today = companyToday();
  if (when === "upcoming") return { query: { [field]: { $gte: today } }, sort: field };
  if (when === "past") return { query: { [field]: { $lt: today } }, sort: `-${field}` };
  return { query: {}, sort: `-${field}` };
};

/** One value of a status field ([value, label] options); "none" also matches records where it was never set. */
export const enumFilter = (field, value, options) => {
  if (!value || value === "all") return {};
  if (value !== "none") return { [field]: value };
  return { [field]: { $nin: options.map(([v]) => v).filter((v) => v !== "all" && v !== "none") } };
};