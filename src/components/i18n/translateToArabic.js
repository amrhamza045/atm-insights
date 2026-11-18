import { base44 } from "@/api/base44Client";
import { AR_DICT } from "./arDictionary";

const LS_KEY = "b44_ar_auto_cache_v1";

const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
};

/**
 * Translates English strings to Arabic for exports (PDFs etc.), reusing the same
 * caches as the on-screen auto-translator: built-in dictionary, local cache,
 * shared UiTranslation records, then one AI batch for whatever is still missing.
 * Returns { [english]: arabic }; strings that can't be translated are omitted.
 */
export async function translateToArabic(strings) {
  const wanted = [...new Set(strings.map((s) => String(s || "").trim()).filter((s) => s && !/[\u0600-\u06FF]/.test(s)))];
  const local = readLocal();
  const out = {};
  let missing = [];
  wanted.forEach((s) => { const hit = AR_DICT[s] || local[s]; if (hit) out[s] = hit; else missing.push(s); });

  if (missing.length) {
    const rows = await base44.entities.UiTranslation.filter({ source: { $in: missing } }).catch(() => []);
    (rows.items || rows || []).forEach((r) => { if (r.source && r.target) out[r.source] = r.target; });
    missing = missing.filter((s) => !out[s]);
  }

  if (missing.length) {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Translate each of these restaurant/catering texts (item names, menu or package descriptions) from English into natural Modern Standard Arabic as used in Egyptian kitchens. Keep brand names and codes as-is. Return JSON {"translations":[{"en":"<original exactly>","ar":"<arabic>"}]} for EVERY input.\n\n${JSON.stringify(missing)}`,
      response_json_schema: { type: "object", properties: { translations: { type: "array", items: { type: "object", properties: { en: { type: "string" }, ar: { type: "string" } }, required: ["en", "ar"] } } }, required: ["translations"] },
    }).catch(() => null);
    const fresh = {};
    (res?.translations || []).forEach((t) => { if (missing.includes(t?.en) && t.ar?.trim()) fresh[t.en] = t.ar.trim(); });
    if (Object.keys(fresh).length) {
      Object.assign(out, fresh);
      try { localStorage.setItem(LS_KEY, JSON.stringify({ ...readLocal(), ...fresh })); } catch { /* storage full */ }
      base44.entities.UiTranslation.bulkCreate(Object.entries(fresh).map(([source, target]) => ({ source, target }))).catch(() => {});
    }
  }
  return out;
}