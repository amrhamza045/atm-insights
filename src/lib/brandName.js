import { base44 } from "@/api/base44Client";

// Brand name as set in Admin → Branding (RestaurantInfo.brand_name).
const KEY = "brand_name";
let cached = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();

export function setBrandName(name) {
  cached = name || "";
  try { localStorage.setItem(KEY, cached); } catch { /* ignore */ }
}

// Synchronous read for render-time text and message templates.
export function brandName() {
  return cached || "";
}

export async function getBrandName() {
  const info = await base44.entities.RestaurantInfo.list().catch(() => []);
  setBrandName(info[0]?.brand_name);
  return cached;
}