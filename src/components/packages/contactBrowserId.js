const KEY = "contact_browser_id";

// Stable per-browser ID used only to rate-limit contact requests.
export function getContactBrowserId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}