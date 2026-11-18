/** Short, readable, uppercase token from a name (e.g. "Metro Market" -> "METRO-MARKET"). */
function slug(text, maxWords = 2) {
  return String(text || "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, maxWords)
    .join("-")
    .toUpperCase()
    .slice(0, 20);
}

/**
 * Order numbers people can actually read on a shelf or in a chat:
 * PO-REC-0910-CORPORATE-EVENT-METRO-4821
 * (source prefix, needed-by date, the event it serves, the supplier, and a short unique tail).
 */
export function readableOrderNumber({ prefix = "PO-REC", neededBy, eventName, supplierName, index }) {
  const datePart = (neededBy || new Date().toISOString().split("T")[0]).replace(/-/g, "").slice(4);
  const tail = String(Date.now()).slice(-4);
  return [prefix, datePart, slug(eventName), slug(supplierName), tail, index > 1 ? index : null]
    .filter(Boolean)
    .join("-");
}