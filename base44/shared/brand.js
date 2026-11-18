// Brand name from Admin → Branding (RestaurantInfo.brand_name), with a generic fallback.
export async function loadBrandName(base44, fallback = 'Restaurant') {
  const rows = await base44.asServiceRole.entities.RestaurantInfo.list().catch(() => []);
  return rows?.[0]?.brand_name || fallback;
}

// App address from Restaurant Info → Website (no trailing slash), falling back to the published app URL.
export async function loadAppUrl(base44, fallback = 'https://rosemary.base44.app') {
  const rows = await base44.asServiceRole.entities.RestaurantInfo.list().catch(() => []);
  return (rows?.[0]?.website || fallback).replace(/\/+$/, '');
}