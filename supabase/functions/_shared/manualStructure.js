// Structure of the VeraKit360 module manual: Domain › Chapter › Module.
// Domains follow the top navigation bar (Catering, Operations, Analytics,
// Admin, the customer-facing site, Help); chapters group the modules the way
// the screens inside each domain are grouped. Every module file uses `mod()`
// so each module carries its domain, chapter and chapter code.

export const DOMAINS = [
  { key: "catering", label: "Catering", nav: "Top bar › Catering", chapters: [
    { key: "booking", label: "Booking & Sales" },
    { key: "planning", label: "Planning & Prep" },
    { key: "event_day", label: "Event Day" },
    { key: "guests", label: "Guest Engagement" },
    { key: "settings", label: "Catering Settings" },
  ] },
  { key: "operations", label: "Operations", nav: "Top bar › Operations menu", chapters: [
    { key: "sales", label: "Sales & Service" },
    { key: "kitchen", label: "Kitchen & Production" },
    { key: "stock", label: "Stock & Purchasing" },
    { key: "delivery", label: "Delivery" },
    { key: "people", label: "People & HR" },
    { key: "customers", label: "Customers (CRM)" },
    { key: "control", label: "Approvals & Control" },
    { key: "finance", label: "Finance & Accounting" },
  ] },
  { key: "analytics", label: "Analytics", nav: "Top bar › Analytics menu", chapters: [
    { key: "executive", label: "Executive & Branch Reporting" },
    { key: "commercial", label: "Sales & Customer Analytics" },
    { key: "production", label: "Production & Menu Analytics" },
  ] },
  { key: "admin", label: "Admin", nav: "Top bar › Admin", chapters: [
    { key: "setup", label: "Business Setup" },
    { key: "access", label: "Access Control" },
    { key: "loyalty", label: "Loyalty Program (GenMo)" },
    { key: "marketing", label: "Marketing & Outreach" },
    { key: "maintenance", label: "Maintenance & Data" },
  ] },
  { key: "customer", label: "Customer-Facing", nav: "Public website and client app", chapters: [
    { key: "website", label: "Website & Online Ordering" },
    { key: "client_app", label: "Client App" },
  ] },
  { key: "help", label: "Help", nav: "Top bar › Help", chapters: [
    { key: "support", label: "Support & Documentation" },
  ] },
];

const domainOf = (key) => {
  const domain = DOMAINS.find((d) => d.key === key);
  if (!domain) throw new Error(`Unknown manual domain ${key}`);
  return domain;
};

// Wraps a module definition with its place in the manual.
export const mod = (domainKey, chapterKey, module) => {
  const domain = domainOf(domainKey);
  const chapterIndex = domain.chapters.findIndex((c) => c.key === chapterKey);
  if (chapterIndex < 0) throw new Error(`Unknown chapter ${chapterKey} in ${domainKey}`);
  return {
    ...module,
    solo: true,
    category: domain.label,
    domain: domain.label,
    chapter: domain.chapters[chapterIndex].label,
    chapter_code: `${DOMAINS.indexOf(domain) + 1}.${chapterIndex + 1}`,
  };
};

export const FINANCE_STATUS_LABELS = {
  posts: "Posts to Finance automatically",
  reported: "Read by Finance reports",
  not_linked: "Not yet linked to Finance",
  none: "No direct financial impact",
};