import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MODULES_QUERY_KEY, fetchModuleSettings } from "@/hooks/useModuleAccess";
import { getNumeralStyle, setNumeralStyle, convertDigits, NUMERAL_EVENT } from "./numeralPreference";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "INPUT", "TEXTAREA", "SELECT", "OPTION"]);

const shouldSkip = (node) => {
  let el = node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName) || el.isContentEditable || el.hasAttribute("data-no-numerals")) return true;
    el = el.parentElement;
  }
  return false;
};

const convertText = (node, style) => {
  if (!node || typeof node.nodeValue !== "string") return;
  // Fast-path: only inspect ancestor tags when the text actually contains digits from the OTHER script
  const sourceDigitRe = style === "arabic" ? /[0-9]/ : /[٠-٩]/;
  if (!sourceDigitRe.test(node.nodeValue) || shouldSkip(node)) return;
  const next = convertDigits(node.nodeValue, style);
  if (next !== node.nodeValue) node.nodeValue = next;
};

const convertTree = (root, style) => {
  if (root.nodeType === Node.TEXT_NODE) return convertText(root, style);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) convertText(walker.currentNode, style);
};

/**
 * Forces the app-wide numeral style (Arabic-Indic or Western digits)
 * on every rendered text node.
 */
export default function NumeralEnforcer() {
  const { data: settings } = useQuery({
    queryKey: MODULES_QUERY_KEY,
    queryFn: fetchModuleSettings,
    staleTime: 60_000,
  });
  useEffect(() => {
    const saved = settings?.numeral_style;
    if (saved && saved !== getNumeralStyle()) setNumeralStyle(saved);
  }, [settings?.numeral_style]);

  useEffect(() => {
    let style = getNumeralStyle(), frame = null;
    const roots = new Set();
    const collect = mutations => mutations.forEach(m => {
      if (m.type === "characterData") roots.add(m.target);
      else m.addedNodes.forEach(node => roots.add(node));
    });
    const observer = new MutationObserver(mutations => {
      collect(mutations);
      if (frame === null) frame = requestAnimationFrame(flush);
    });
    const flush = () => {
      frame = null;
      collect(observer.takeRecords());
      observer.disconnect();
      for (const root of roots) {
        if (!root.isConnected) continue;
        let parent = root.parentNode;
        while (parent && !roots.has(parent)) parent = parent.parentNode;
        if (!parent) convertTree(root, style);
      }
      roots.clear();
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    };
    roots.add(document.body);
    flush();
    const onChange = e => {
      style = e.detail || getNumeralStyle();
      roots.add(document.body);
      if (frame === null) frame = requestAnimationFrame(flush);
    };
    window.addEventListener(NUMERAL_EVENT, onChange);
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener(NUMERAL_EVENT, onChange);
    };
  }, []);

  return null;
}