// Stable heading ids so the How-To task index can jump straight to a procedure.
export default function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[*_`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}