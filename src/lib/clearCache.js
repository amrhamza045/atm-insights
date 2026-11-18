/**
 * Reliably clears all browser caches and reloads the page.
 *
 * This addresses the deprecation of window.location.reload(true) by:
 * 1. Clearing all Cache API entries (Cache Storage used by service workers)
 * 2. Unregistering any active service workers so they can't serve stale content
 * 3. Appending a cache-busting query param to force a fresh fetch of index.html
 */
export async function clearCacheAndReload() {
  // 1. Clear all Cache API entries
  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch (e) {
    console.warn("Failed to clear Cache API:", e);
  }

  // 2. Unregister any active service workers
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
  } catch (e) {
    console.warn("Failed to unregister service workers:", e);
  }

  // 3. Reload with cache-busting query param to bypass HTTP cache on index.html
  const url = new URL(window.location.href);
  url.searchParams.set("v", Date.now());
  window.location.href = url.toString();
}