import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";

const VERAKIT360_LOGO_URL =
  "https://media.base44.com/images/public/69709def3c5445d198d66244/38fa2ddec_ChatGPTImageJun282026at03_28_28PM.png";
const VERAGATES_HUB_LOGO_URL =
  "https://media.base44.com/images/public/69709def3c5445d198d66244/3e672a413_img-a820cf20-b513-4b73-84b3-12b205524572.png";

const FOOTER_TEXT = {
  en: { poweredBy: "Powered By" },
  ar: { poweredBy: "مدعوم بواسطة" },
};

const SECTION_META = [
  { key: "description", title: "Description" },
  { key: "benefits_and_features", title: "Benefits & Features" },
  { key: "max_benefit_strategy", title: "How to Get Maximum Benefit" },
  { key: "cautions", title: "Cautions to Avoid" },
  { key: "required_accurate_data", title: "Required Accurate Data" },
  { key: "usage_guide", title: "Complete Usage Guide" },
  { key: "finance_integration", title: "Finance Integration" },
];

async function fetchImageAsDataURL(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function stripMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const HEADER_TOP = 8;
const HEADER_HEIGHT = 22;       // space reserved at top for the VeraKit360 logo
const FOOTER_HEIGHT = 24;       // space reserved at bottom for Veragates Hub footer

function addWrappedText(doc, text, x, y, maxWidth, lineHeight, fontSize, contentBottom) {
  doc.setFontSize(fontSize);
  const paragraphs = text.split("\n");
  let currentY = y;
  for (const para of paragraphs) {
    if (!para.trim()) { currentY += lineHeight / 2; continue; }
    const lines = doc.splitTextToSize(para, maxWidth);
    for (const line of lines) {
      if (currentY + lineHeight > contentBottom) {
        doc.addPage();
        currentY = HEADER_TOP + HEADER_HEIGHT + 2;
      }
      doc.text(line, x, currentY);
      currentY += lineHeight;
    }
    currentY += lineHeight / 3;
  }
  return currentY;
}

// Draws VeraKit360 logo at top-center of a page
function drawHeader(doc, logoData, pageWidth) {
  if (!logoData) return;
  try {
    const logoW = 35;
    const logoH = 16;
    const logoX = (pageWidth - logoW) / 2;
    doc.addImage(logoData, "PNG", logoX, HEADER_TOP, logoW, logoH);
  } catch (e) { /* skip if image fails */ }
  // Thin divider line under the header
  doc.setDrawColor(0, 40, 85);
  doc.setLineWidth(0.4);
  doc.line(20, HEADER_TOP + HEADER_HEIGHT + 1, pageWidth - 20, HEADER_TOP + HEADER_HEIGHT + 1);
}

// Draws Veragates Hub logo + "Powered By" + contact info at the bottom of a page
function drawFooter(doc, logoData, pageWidth, pageHeight, language) {
  const ft = { ...(FOOTER_TEXT[language] || FOOTER_TEXT.en), ...vendorContact };
  const footerY = pageHeight - FOOTER_HEIGHT;
  const isRTL = language === "ar";

  // Divider line above footer
  doc.setDrawColor(0, 128, 128);
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 2, pageWidth - 20, footerY - 2);

  // Veragates Hub logo (left side) with "Powered By" text
  if (logoData) {
    try {
      const hubLogoW = 28;
      const hubLogoH = 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(ft.poweredBy, 20, footerY + 3);
      doc.addImage(logoData, "PNG", 20, footerY + 5, hubLogoW, hubLogoH);
    } catch (e) { /* skip */ }
  }

  // Contact info (right side)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const contactX = pageWidth - 20;
  const align = "right";
  [ft.website, ft.email, ft.mobile].filter(Boolean).forEach((line, i) => {
    doc.text(line, contactX, footerY + 3 + i * 5, { align });
  });

  doc.setTextColor(0, 0, 0);
}

let vendorContact = { website: "", email: "", mobile: "" };

export async function exportManualToPDF(sections, language, t, includeScreenshots = true) {
  const { data } = await base44.functions.invoke("getVendorContact", {});
  vendorContact = data;
  const isRTL = language === "ar";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  const contentX = isRTL ? pageWidth - margin : margin;
  const contentTop = HEADER_TOP + HEADER_HEIGHT + 5;
  const contentBottom = pageHeight - FOOTER_HEIGHT - 2;

  // Fetch both logos as base64 data URLs
  let verakitLogoData = null;
  let veragatesLogoData = null;
  try {
    const [vkData, vgData] = await Promise.all([
      fetchImageAsDataURL(VERAKIT360_LOGO_URL),
      fetchImageAsDataURL(VERAGATES_HUB_LOGO_URL),
    ]);
    verakitLogoData = vkData;
    veragatesLogoData = vgData;
  } catch (e) {
    // If logos fail to load, continue without them
  }

  // Arabic uses html2canvas-based rendering for proper RTL text shaping
  if (language === "ar") {
    const { exportArabicPDF } = await import("./ManualPdfArabicExporter");
    await exportArabicPDF(sections, t, verakitLogoData, veragatesLogoData, true, vendorContact);
    return;
  }

  const sectionMeta = t?.sections
    ? [
        { key: "description", title: t.sections.description },
        { key: "benefits_and_features", title: t.sections.benefits },
        { key: "max_benefit_strategy", title: t.sections.strategy },
        { key: "cautions", title: t.sections.cautions },
        { key: "required_accurate_data", title: t.sections.data },
        { key: "usage_guide", title: t.sections.guide },
        { key: "finance_integration", title: t.sections.finance },
      ]
    : SECTION_META;

  // ── Cover page ──
  if (verakitLogoData) {
    try {
      const coverLogoW = 60;
      const coverLogoH = 28;
      doc.addImage(verakitLogoData, "PNG", (pageWidth - coverLogoW) / 2, 30, coverLogoW, coverLogoH);
    } catch (e) { /* skip */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  const title = t?.title || "Vera F&B Ops Manual";
  doc.text(title, pageWidth / 2, 75, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleDateString(isRTL ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(dateStr, pageWidth / 2, 85, { align: "center" });
  doc.setFontSize(12);
  doc.text(`${sections.length} ${isRTL ? "وحدة" : "modules"}`, pageWidth / 2, 95, { align: "center" });

  // ── Table of contents ──
  doc.addPage();
  let tocY = contentTop + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(isRTL ? "فهرس المحتويات" : "Table of Contents", pageWidth / 2, tocY, { align: "center" });
  tocY += 10;
  const cats = [];
  sections.forEach(s => { if (!cats.includes(s.category)) cats.push(s.category); });
  cats.forEach(cat => {
    const catModules = sections.filter(s => s.category === cat);
    if (tocY > contentBottom) { doc.addPage(); tocY = contentTop; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(cat, contentX, tocY);
    tocY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    catModules.forEach(m => {
      if (tocY > contentBottom) { doc.addPage(); tocY = contentTop; }
      doc.text(`  • ${m.module_name}`, contentX, tocY);
      tocY += 5;
    });
    tocY += 3;
  });

  // ── Content pages ──
  for (const section of sections) {
    doc.addPage();
    let y = contentTop;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    if (y + 10 > contentBottom) { doc.addPage(); y = contentTop; }
    doc.text(section.module_name || "Module", pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text([section.chapter_code, section.category, section.chapter].filter(Boolean).join("  ·  "), pageWidth / 2, y, { align: "center" });
    y += 8;

    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Inline screenshots
    if (includeScreenshots && section.screenshot_urls?.length > 0) {
      for (const screenshotUrl of section.screenshot_urls) {
        try {
          const imgData = await fetchImageAsDataURL(screenshotUrl);
          if (!imgData) continue;
          const imgW = maxWidth;
          const imgH = imgW * 0.5;
          if (y + imgH + 5 > contentBottom) { doc.addPage(); y = contentTop; }
          doc.addImage(imgData, "JPEG", margin, y, imgW, imgH);
          y += imgH + 5;
        } catch (e) { /* skip on error */ }
      }
    }

    sectionMeta.forEach(({ key, title: sectionTitle }) => {
      const content = stripMarkdown(section[key]);
      if (!content) return;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      if (y + 8 > contentBottom) { doc.addPage(); y = contentTop; }
      doc.text(sectionTitle, contentX, y);
      y += 7;

      y = addWrappedText(doc, content, contentX, y, maxWidth, 5, 10, contentBottom);
      y += 4;

      if (y + 5 < contentBottom) {
        doc.setDrawColor(220);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
      }
    });
  }

  // ── Post-process: add header + footer to every page ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i === 1) {
      // Cover page: no header logo (already has large one), but add footer
      drawFooter(doc, veragatesLogoData, pageWidth, pageHeight, language);
    } else {
      drawHeader(doc, verakitLogoData, pageWidth);
      drawFooter(doc, veragatesLogoData, pageWidth, pageHeight, language);
    }

    // Page number (centered in the footer area)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`${i} / ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  const filename = isRTL ? "VeraFBOps_Manual_AR.pdf" : "VeraFBOps_Manual_EN.pdf";
  doc.save(filename);
}