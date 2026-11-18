import { jsPDF } from "jspdf";
import { withGroupHeaders } from "./docLineGroups";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { DOC_STRINGS, buildDocRows, buildDocMeta } from "./cateringDocStrings";

const MARGIN = 18;
const HEADER_H = 26;
const FOOTER_H = 16;

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

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [15, 23, 42];
}

function drawHeader(doc, { logoData, brandName, title, accent, pageWidth }) {
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", MARGIN, 10, 26, 12);
    } catch { /* logo optional */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...accent);
  doc.text(brandName, logoData ? MARGIN + 30 : MARGIN, 18);

  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text(title, pageWidth - MARGIN, 18, { align: "right" });

  doc.setDrawColor(...accent);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, HEADER_H, pageWidth - MARGIN, HEADER_H);
  doc.setTextColor(0, 0, 0);
}

function drawFooter(doc, { pageWidth, pageHeight, page, total, hideNote }) {
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, pageHeight - FOOTER_H, pageWidth - MARGIN, pageHeight - FOOTER_H);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  if (!hideNote) doc.text(DOC_STRINGS.en.footer, MARGIN, pageHeight - FOOTER_H + 5);
  doc.text(`${page} / ${total}`, pageWidth - MARGIN, pageHeight - FOOTER_H + 5, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

/**
 * Renders a catering document as a real PDF and triggers a download.
 * `doc` is the already-assembled document object from CateringDocumentDialog —
 * this function only renders it, it never recomputes any billing.
 */
export async function buildCateringPdf({ type, event, docData, quote, reconciliation, branding }) {
  const s = DOC_STRINGS.en;
  const brandName = branding?.brand_name || "Catering";
  const accent = hexToRgb(branding?.primary_color);
  const title = s.titles[type] || "DOCUMENT";

  let logoData = null;
  if (branding?.logo_url) {
    try { logoData = await fetchImageAsDataURL(branding.logo_url); } catch { /* continue without */ }
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentBottom = pageHeight - FOOTER_H - 4;
  const contentWidth = pageWidth - MARGIN * 2;

  drawHeader(pdf, { logoData, brandName, title, accent, pageWidth });
  let y = HEADER_H + 8;

  // ── Meta block ──
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  buildDocMeta({ type, event, docData, quote, s }).forEach((line) => {
    pdf.splitTextToSize(line, contentWidth).forEach((l) => { pdf.text(l, MARGIN, y); y += 4.6; });
  });
  pdf.setTextColor(0, 0, 0);
  y += 4;

  if (type === "quotation" && quote?.package_description) {
    pdf.setFont("helvetica", "bold");
    pdf.text(s.packageDetails, MARGIN, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.splitTextToSize(String(quote.package_description), contentWidth).forEach((l) => {
      if (y > contentBottom) { pdf.addPage(); drawHeader(pdf, { logoData, brandName, title, accent, pageWidth }); y = HEADER_H + 12; }
      pdf.text(l, MARGIN, y); y += 4.6;
    });
    y += 4;
  }

  // ── Line-item table ──
  const colQty = pageWidth - MARGIN - 78;
  const colUnit = pageWidth - MARGIN - 42;
  const colTotal = pageWidth - MARGIN;

  const drawTableHead = () => {
    pdf.setFillColor(245, 246, 248);
    pdf.rect(MARGIN, y - 4.6, contentWidth, 7, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.text(s.description, MARGIN + 1.5, y);
    pdf.text(s.qty, colQty, y, { align: "right" });
    pdf.text(s.unit, colUnit, y, { align: "right" });
    pdf.text(s.lineTotal, colTotal - 1.5, y, { align: "right" });
    y += 6;
    pdf.setFont("helvetica", "normal");
  };
  drawTableHead();

  pdf.setFontSize(9);
  if (docData.lines.length === 0) {
    pdf.setTextColor(140, 140, 140);
    pdf.text(s.noLines, MARGIN + 1.5, y);
    pdf.setTextColor(0, 0, 0);
    y += 6;
  }
  withGroupHeaders(docData.lines).forEach((l) => {
    if (l.subtotal !== undefined) {
      pdf.setFont("helvetica", "bold");
      pdf.text(s.subtotal, colUnit, y, { align: "right" });
      pdf.text(formatCurrency(l.subtotal, true), colTotal - 1.5, y, { align: "right" });
      pdf.setFont("helvetica", "normal");
      y += 7;
      return;
    }
    if (l.header) {
      if (y + 9 > contentBottom) {
        pdf.addPage();
        drawHeader(pdf, { logoData, brandName, title, accent, pageWidth });
        y = HEADER_H + 12;
        drawTableHead();
      }
      pdf.setFillColor(40, 40, 40);
      pdf.rect(MARGIN, y - 4.2, pageWidth - MARGIN * 2, 6.4, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.text(String(l.header), MARGIN + 1.5, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      y += 6.5;
      return;
    }
    const nameLines = pdf.splitTextToSize(String(l.name || ""), colQty - MARGIN - 6);
    if (y + nameLines.length * 4.6 > contentBottom) {
      pdf.addPage();
      drawHeader(pdf, { logoData, brandName, title, accent, pageWidth });
      y = HEADER_H + 12;
      drawTableHead();
      pdf.setFontSize(9);
    }
    nameLines.forEach((nl, i) => { pdf.text(nl, MARGIN + 1.5, y + i * 4.6); });
    pdf.text(String(l.quantity || 1), colQty, y, { align: "right" });
    pdf.text(formatCurrency(l.unit_price || 0, true), colUnit, y, { align: "right" });
    pdf.text(formatCurrency(l.line_total || 0, true), colTotal - 1.5, y, { align: "right" });
    y += nameLines.length * 4.6 + 1.4;
    pdf.setDrawColor(235);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, y - 1, pageWidth - MARGIN, y - 1);
    y += 1.6;
  });

  // ── Totals block ──
  // Tax / service / discount are rendered exactly as stored on the quote, so
  // whatever exemption flags were set when it was built are reflected as-is.
  const rows = buildDocRows({ type, docData, quote, reconciliation, s });

  y += 4;
  const labelX = pageWidth - MARGIN - 62;
  pdf.setFontSize(9);
  rows.forEach(([label, amount]) => {
    if (y > contentBottom) { pdf.addPage(); drawHeader(pdf, { logoData, brandName, title, accent, pageWidth }); y = HEADER_H + 12; }
    pdf.setTextColor(90, 90, 90);
    pdf.text(label, labelX, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(formatCurrency(amount, true), colTotal, y, { align: "right" });
    y += 5.2;
  });

  pdf.setDrawColor(...accent);
  pdf.setLineWidth(0.5);
  pdf.line(labelX, y - 1.5, colTotal, y - 1.5);
  y += 3;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.text(type === "credit_note" ? s.credited : s.total, labelX, y);
  pdf.text(formatCurrency(docData.total, true), colTotal, y, { align: "right" });
  y += 6;

  if (type !== "quotation" && type !== "credit_note") {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text(s.receivedToDate, labelX, y);
    pdf.setTextColor(0, 0, 0);
    pdf.text(formatCurrency(docData.paid, true), colTotal, y, { align: "right" });
    y += 5.6;
  }
  if (type === "invoice" || type === "final_invoice") {
    const balance = docData.total - docData.paid;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(balance < 0 ? s.refundOwed : s.balanceDue, labelX, y);
    pdf.text(formatCurrency(Math.abs(balance), true), colTotal, y, { align: "right" });
  }

  const pages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    drawFooter(pdf, { pageWidth, pageHeight, page: i, total: pages, hideNote: type === "quotation" });
  }

  return { pdf, filename: `${title.replace(/\s+/g, "_")}_${docData.number}.pdf` };
}

export async function downloadCateringPdf(args) {
  const { pdf, filename } = await buildCateringPdf(args);
  pdf.save(filename);
}