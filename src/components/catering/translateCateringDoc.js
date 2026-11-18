import { translateToArabic } from "@/components/i18n/translateToArabic";

// Returns Arabic copies of the document's free text (line names/descriptions,
// package description, event type). Amounts and quantities are untouched.
export async function translateCateringDoc({ doc, quote, event }) {
  const tr = await translateToArabic([
    ...doc.lines.flatMap((l) => [l.name, l.description]),
    quote?.package_description,
    event?.event_type,
  ]);
  const t = (s) => (s && tr[String(s).trim()]) || s;
  return {
    doc: { ...doc, lines: doc.lines.map((l) => ({ ...l, name: t(l.name), description: t(l.description) })) },
    quote: quote && { ...quote, package_description: t(quote.package_description) },
    event: event && { ...event, event_type: t(event.event_type) },
  };
}