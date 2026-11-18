import { jsPDF } from "jspdf";
import { brandName } from "@/lib/brandName";
import { renderChapterMarkdown } from "./manualPdfBlocks";
import { sanitizePdfText as s } from "./manualPdfText";
import { hexToRgb } from "@/lib/colorUtils";

const DEFAULT_BRAND = { name: brandName(), primary: "#D97706", accent: "#B45309" };

const MARGIN = 18;
const HEADER_H = 12;
const FOOTER_H = 14;
const TOC_LINES_PER_PAGE = 32;

async function fetchImageAsDataURL(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const rgb = (hex, fallback) => {
  const c = hexToRgb(hex) || hexToRgb(fallback);
  return [c.r, c.g, c.b];
};

/**
 * Builds and downloads a branded manual "book".
 * parts: [{ label, chapters: [{ number, title, audience, content }] }]
 * brand: { brand_name, logo_url, primary_color, accent_color }
 */
export async function downloadManualBook({ parts, brand = {}, subtitle, filename }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const brandName = brand.brand_name || DEFAULT_BRAND.name;
  const brandRgb = rgb(brand.primary_color, DEFAULT_BRAND.primary);
  const accentRgb = rgb(brand.accent_color || brand.primary_color, DEFAULT_BRAND.accent);

  let logoData = null;
  if (brand.logo_url) {
    try { logoData = await fetchImageAsDataURL(brand.logo_url); } catch { /* cover renders without it */ }
  }

  const ctx = {
    doc,
    margin: MARGIN,
    pageWidth,
    contentX: MARGIN,
    maxWidth: pageWidth - MARGIN * 2,
    contentTop: HEADER_H + 10,
    contentBottom: pageHeight - FOOTER_H - 4,
    nextPageTop: HEADER_H + 10,
    brandRgb,
  };

  const multiPart = parts.length > 1;
  const allChapters = parts.flatMap((p) => p.chapters);
  const tocLineCount = allChapters.length + (multiPart ? parts.length * 2 : 1);
  const tocPageCount = Math.max(1, Math.ceil(tocLineCount / TOC_LINES_PER_PAGE));

  // ── Cover (page 1) ──
  drawCover(doc, { pageWidth, pageHeight, logoData, brandName, subtitle, brandRgb, accentRgb, count: allChapters.length });

  // ── Content — record where each chapter starts (before TOC pages are inserted) ──
  const entries = [];
  parts.forEach((part, partIndex) => {
    if (multiPart) {
      doc.addPage();
      drawPartDivider(doc, { pageWidth, pageHeight, label: s(part.label), brandRgb, index: partIndex + 1 });
      entries.push({ type: "part", label: s(part.label), page: doc.getNumberOfPages() });
    }
    part.chapters.forEach((chapter) => {
      doc.addPage();
      entries.push({ type: "chapter", number: chapter.number, title: s(chapter.title), audience: s(chapter.audience || ""), page: doc.getNumberOfPages() });
      renderChapterMarkdown(ctx, chapter.content, ctx.contentTop + 4);
    });
  });

  // ── Table of contents — inserted right after the cover, page numbers offset ──
  for (let i = 0; i < tocPageCount; i++) doc.insertPage(2 + i);
  drawToc(doc, {
    entries: entries.map((e) => ({ ...e, page: e.page + tocPageCount })),
    tocPageCount,
    pageWidth,
    contentTop: ctx.contentTop,
    contentBottom: ctx.contentBottom,
    brandRgb,
    multiPart,
  });

  // ── Running header + footer on every page except the cover ──
  const total = doc.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(brandName, MARGIN, HEADER_H);
    doc.text(subtitle || "User Manual", pageWidth - MARGIN, HEADER_H, { align: "right" });
    doc.setDrawColor(...brandRgb);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, HEADER_H + 2.5, pageWidth - MARGIN, HEADER_H + 2.5);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pageHeight - FOOTER_H + 2, pageWidth - MARGIN, pageHeight - FOOTER_H + 2);
    doc.setTextColor(148, 163, 184);
    doc.text(`${p} / ${total}`, pageWidth / 2, pageHeight - FOOTER_H + 7, { align: "center" });
  }

  doc.save(filename);
}

function drawCover(doc, { pageWidth, pageHeight, logoData, brandName, subtitle, brandRgb, accentRgb, count }) {
  doc.setFillColor(...brandRgb);
  doc.rect(0, 0, pageWidth, 6, "F");
  doc.setFillColor(...accentRgb);
  doc.rect(0, pageHeight - 6, pageWidth, 6, "F");

  if (logoData) {
    try {
      const w = 46;
      const h = 24;
      doc.addImage(logoData, (pageWidth - w) / 2, 52, w, h);
    } catch { /* skip */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(100, 116, 139);
  doc.text(brandName.toUpperCase(), pageWidth / 2, 96, { align: "center" });

  doc.setFontSize(30);
  doc.setTextColor(...brandRgb);
  doc.text(doc.splitTextToSize(subtitle || "User Manual", pageWidth - 60), pageWidth / 2, 116, { align: "center" });

  doc.setDrawColor(...brandRgb);
  doc.setLineWidth(0.6);
  doc.line(pageWidth / 2 - 24, 128, pageWidth / 2 + 24, 128);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`${count} chapters`, pageWidth / 2, 140, { align: "center" });
  doc.text(
    new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }),
    pageWidth / 2,
    148,
    { align: "center" }
  );
}

function drawPartDivider(doc, { pageWidth, pageHeight, label, brandRgb, index }) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...brandRgb);
  doc.text(`PART ${index}`, pageWidth / 2, pageHeight / 2 - 12, { align: "center" });
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42);
  doc.text(label, pageWidth / 2, pageHeight / 2, { align: "center" });
  doc.setDrawColor(...brandRgb);
  doc.setLineWidth(0.6);
  doc.line(pageWidth / 2 - 20, pageHeight / 2 + 8, pageWidth / 2 + 20, pageHeight / 2 + 8);
}

function drawToc(doc, { entries, tocPageCount, pageWidth, contentTop, contentBottom, brandRgb, multiPart }) {
  let page = 2;
  doc.setPage(page);
  let y = contentTop + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("Contents", MARGIN, y);
  doc.setDrawColor(...brandRgb);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y + 2.5, pageWidth - MARGIN, y + 2.5);
  y += 12;

  const nextTocPage = () => {
    page += 1;
    if (page > 1 + tocPageCount) return false;
    doc.setPage(page);
    y = contentTop + 6;
    return true;
  };

  entries.forEach((entry) => {
    if (y > contentBottom - 4 && !nextTocPage()) return;

    if (entry.type === "part") {
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...brandRgb);
      doc.text(entry.label.toUpperCase(), MARGIN, y);
      y += 6.5;
      return;
    }

    const label = `${entry.number}. ${entry.title}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.textWithLink(label, MARGIN + (multiPart ? 4 : 0), y, { pageNumber: entry.page });

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(String(entry.page), pageWidth - MARGIN, y, { align: "right" });

    if (entry.audience) {
      y += 4.2;
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text(entry.audience, MARGIN + (multiPart ? 4 : 0), y);
    }
    y += 6.5;
  });
}