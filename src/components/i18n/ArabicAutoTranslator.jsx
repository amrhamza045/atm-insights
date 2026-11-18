import { useEffect } from "react";
import { brandName } from "@/lib/brandName";
import { useLanguage } from "@/components/LanguageProvider";
import { base44 } from "@/api/base44Client";
import { AR_DICT, AR_REGEX_RULES } from "./arDictionary";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "CODE", "PRE"]);
// Brand / proper names that must never be translated
const NO_TRANSLATE = new Set([brandName(), "VeraKit360", "Veragates", "Veragates HUB", "Powered by Veragates HUB"]);
const ATTRS = ["placeholder", "title", "aria-label"];
const LS_KEY = "b44_ar_auto_cache_v1";

// Runtime dictionary: built-in seed + local cache + shared entity cache + live AI results
const runtimeDict = {};
try {
  Object.assign(runtimeDict, JSON.parse(localStorage.getItem(LS_KEY) || "{}"));
} catch { /* ignore corrupted cache */ }
// Built-in dictionary always wins over cached/AI translations
Object.assign(runtimeDict, AR_DICT);

let pending = new Set();
let inFlight = new Set();
const retryCount = {};
let flushTimer = null;
let entityLoaded = false;
let active = false;

function saveLocal(entries) {
  try {
    const cur = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    Object.assign(cur, entries);
    localStorage.setItem(LS_KEY, JSON.stringify(cur));
  } catch { /* storage full — skip */ }
}

// Strings worth sending to the AI translator (skip codes, data values, Arabic, etc.)
function eligible(s) {
  if (s.length < 2 || s.length > 1500) return false;
  if (/[\u0600-\u06FF]/.test(s)) return false; // already contains Arabic
  if (!/[a-zA-Z]{2}/.test(s)) return false; // no real words
  if (/^[A-Z0-9]+-[A-Z0-9-]+$/.test(s)) return false; // codes like SKU-123-AB
  if (/^#|https?:|@/.test(s)) return false; // tags, urls, emails
  if (/^\d/.test(s) && !/[a-zA-Z]{3}/.test(s)) return false; // mostly numeric
  return true;
}

function translate(str) {
  const trimmed = str.trim();
  if (!trimmed || /^[\d.,%#\s—–-]*$/.test(trimmed)) return null;
  if (NO_TRANSLATE.has(trimmed)) return null;
  const hit = runtimeDict[trimmed];
  if (hit !== undefined) return str.replace(trimmed, hit);
  for (const [re, fn] of AR_REGEX_RULES) {
    const m = trimmed.match(re);
    if (m) return str.replace(trimmed, fn(m));
  }
  return null;
}

function collect(str) {
  const t = str.trim();
  if (NO_TRANSLATE.has(t) || runtimeDict[t] !== undefined || inFlight.has(t) || !eligible(t)) return;
  pending.add(t);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer || !active) return;
  flushTimer = setTimeout(flush, 400);
}

async function flush() {
  flushTimer = null;
  if (!active || pending.size === 0) return;
  // Build a batch capped by both count and total characters (long paragraphs allowed)
  const batch = [];
  let chars = 0;
  for (const s of pending) {
    if (batch.length >= 100 || (batch.length > 0 && chars + s.length > 8000)) break;
    batch.push(s);
    chars += s.length;
  }
  batch.forEach((s) => { pending.delete(s); inFlight.add(s); });
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional UI localizer for a restaurant & food-production management system (ERP/POS). Translate each of the following English UI strings into natural, professional Arabic (Modern Standard Arabic, using standard Egyptian business and food-industry terminology where appropriate — e.g. butchery, inventory, payroll, POS terms). Preserve numbers, symbols (*, %, #, …, parentheses) and punctuation structure. Do NOT translate brand names (${brandName()}, VeraKit360, Veragates), product codes, or placeholders. Return JSON: {"translations":[{"en":"<original string exactly as given>","ar":"<arabic translation>"}]} covering EVERY input string.\n\nStrings to translate:\n${JSON.stringify(batch)}`,
      response_json_schema: {
        type: "object",
        properties: {
          translations: {
            type: "array",
            items: {
              type: "object",
              properties: { en: { type: "string" }, ar: { type: "string" } },
              required: ["en", "ar"],
            },
          },
        },
        required: ["translations"],
      },
    });
    const clean = {};
    const wanted = new Set(batch);
    (res?.translations || []).forEach((t) => {
      if (t && wanted.has(t.en) && typeof t.ar === "string" && t.ar.trim() && t.ar.trim() !== t.en) {
        clean[t.en] = t.ar.trim();
      }
    });
    if (Object.keys(clean).length) {
      Object.assign(runtimeDict, clean);
      saveLocal(clean);
      persistToEntity(clean);
      if (active) applyToTree(document.body);
    }
    // Re-queue strings the model skipped (max 2 retries each)
    batch.forEach((s) => {
      if (clean[s] === undefined && (retryCount[s] = (retryCount[s] || 0) + 1) <= 2) pending.add(s);
    });
  } catch {
    // Whole call failed — retry the batch (max 2 retries each)
    batch.forEach((s) => {
      if ((retryCount[s] = (retryCount[s] || 0) + 1) <= 2) pending.add(s);
    });
  }
  finally {
    batch.forEach((s) => inFlight.delete(s));
    if (pending.size) scheduleFlush();
  }
}

async function persistToEntity(entries) {
  const records = Object.entries(entries).map(([source, target]) => ({ source, target }));
  if (!records.length) return;
  try { await base44.entities.UiTranslation.bulkCreate(records); } catch { /* non-critical */ }
}

async function loadEntityCache() {
  if (entityLoaded) return;
  entityLoaded = true;
  try {
    const rows = await base44.entities.UiTranslation.list("-created_date", 1000);
    const map = {};
    rows.forEach((r) => {
      if (r.source && r.target && runtimeDict[r.source] === undefined) map[r.source] = r.target;
    });
    Object.assign(runtimeDict, map);
    saveLocal(map);
  } catch { /* offline or unauthorized — local cache still works */ }
}

function applyToTextNode(node) {
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName)) return;
  if (parent.closest && parent.closest("[data-no-translate]")) return;
  const current = node.nodeValue;
  const t = translate(current);
  if (t !== null && t !== current) {
    if (node.__b44Orig === undefined) node.__b44Orig = current;
    node.nodeValue = t;
  } else if (t === null) {
    collect(current);
  }
}

function applyAttrs(el) {
  ATTRS.forEach((a) => {
    const v = el.getAttribute && el.getAttribute(a);
    if (!v) return;
    const t = translate(v);
    if (t !== null && t !== v) {
      if (!el.__b44OrigAttr) el.__b44OrigAttr = {};
      if (el.__b44OrigAttr[a] === undefined) el.__b44OrigAttr[a] = v;
      el.setAttribute(a, t);
    } else if (t === null) {
      collect(v);
    }
  });
}

function applyToTree(root) {
  if (root.nodeType === Node.TEXT_NODE) return applyToTextNode(root);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(applyToTextNode);
  applyAttrs(root);
  root.querySelectorAll("[placeholder],[title],[aria-label]").forEach(applyAttrs);
}

function restoreAll() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach((node) => {
    if (node.__b44Orig !== undefined) {
      node.nodeValue = node.__b44Orig;
      delete node.__b44Orig;
    }
  });
  document.body.querySelectorAll("[placeholder],[title],[aria-label]").forEach((el) => {
    if (el.__b44OrigAttr) {
      Object.entries(el.__b44OrigAttr).forEach(([a, v]) => el.setAttribute(a, v));
      delete el.__b44OrigAttr;
    }
  });
}

export default function ArabicAutoTranslator() {
  const { language } = useLanguage();

  useEffect(() => {
    if (language !== "ar") {
      active = false;
      restoreAll();
      return;
    }
    active = true;
    applyToTree(document.body);
    loadEntityCache().then(() => { if (active) applyToTree(document.body); });
    const obs = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === "characterData") {
          applyToTextNode(m.target);
        } else if (m.type === "childList") {
          m.addedNodes.forEach((node) => applyToTree(node));
        }
      });
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      active = false;
      obs.disconnect();
    };
  }, [language]);

  return null;
}