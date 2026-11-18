// Finance link status of a manual module: label and badge colours.
export const FINANCE_STATUS = {
  posts: { en: "Posts to Finance", ar: "يُرحَّل للمالية", badge: "bg-success-100 text-success-800", dot: "bg-success-500" },
  reported: { en: "Read by Finance reports", ar: "تقرأه تقارير المالية", badge: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
  not_linked: { en: "Not yet linked to Finance", ar: "غير مربوط بالمالية بعد", badge: "bg-warning-100 text-warning-800", dot: "bg-warning-500" },
  none: { en: "No financial impact", ar: "بدون أثر مالي", badge: "bg-slate-100 text-slate-600", dot: "bg-slate-300" },
};

export const FINANCE_STATUS_ORDER = ["posts", "reported", "not_linked", "none"];