export const PLATFORM_META = {
  instagram: { label: "Instagram", badge: "bg-pink-100 text-pink-700", dot: "bg-pink-500" },
  facebook: { label: "Facebook", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-600" },
  linkedin: { label: "LinkedIn", badge: "bg-sky-100 text-sky-800", dot: "bg-sky-700" },
  whatsapp: { label: "WhatsApp", badge: "bg-green-100 text-green-700", dot: "bg-green-600" },
  tiktok: { label: "TikTok", badge: "bg-slate-200 text-slate-800", dot: "bg-slate-800" },
};

export const PRIORITY_META = {
  Urgent: "bg-red-100 text-red-700",
  High: "bg-amber-100 text-amber-700",
  Medium: "bg-blue-100 text-blue-700",
  Low: "bg-slate-100 text-slate-600",
};

export function platformOf(lead) {
  return (lead.platform || lead.source || "facebook").toLowerCase();
}