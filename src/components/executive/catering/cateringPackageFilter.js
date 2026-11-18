// Pure event-type (package category / package) filter logic for catering analytics.
// categories: string[] — whole categories selected; packages: string[] — individual packages selected.
// An event matches when its category OR its package is selected.

export const DEFAULT_PACKAGE_FILTER = { categories: [], packages: [] };

export const UNCATEGORIZED = "Uncategorized";
export const MANUAL_PACKAGE = "Manual / Custom";

export function isPackageFilterActive({ categories = [], packages = [] } = {}) {
  return categories.length > 0 || packages.length > 0;
}

// Groups the package catalog into { category, packages: [] } rows for the dropdown.
export function buildPackageGroups(packages = []) {
  const map = {};
  packages
    .filter((p) => p.is_active !== false)
    .forEach((p) => {
      const cat = p.package_category || UNCATEGORIZED;
      map[cat] = map[cat] || new Set();
      if (p.name) map[cat].add(p.name);
    });
  return Object.entries(map)
    .map(([category, names]) => ({ category, packages: [...names].sort() }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

// The event's package identity comes from its active quote (same source as the P&L rows).
export function eventPackageIdentity(event, quoteById = {}) {
  const quote = quoteById[event?.active_quote_id];
  return {
    category: quote?.package_category || UNCATEGORIZED,
    packageName: quote?.package_name || MANUAL_PACKAGE,
  };
}

export function eventMatchesPackageFilter(event, filter, quoteById = {}) {
  if (!isPackageFilterActive(filter)) return true;
  const { categories = [], packages = [] } = filter;
  const { category, packageName } = eventPackageIdentity(event, quoteById);
  return categories.includes(category) || packages.includes(packageName);
}