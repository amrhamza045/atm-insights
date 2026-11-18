import html2canvas from "html2canvas";
import { withGroupHeaders } from "./docLineGroups";
import { jsPDF } from "jspdf";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { DOC_STRINGS, buildDocRows, buildDocMeta } from "./cateringDocStrings";

const PAGE_W = 794; // A4 at ~96 DPI
const PAGE_H = 1123;

async function ensureArabicFont() {
  const fontUrl = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap";
  if (!document.querySelector(`link[href="${fontUrl}"]`)) {
    const link = document.createElement("link");
    link.href = fontUrl;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (document.fonts) {
    try {
      await document.fonts.load("400 12px Cairo");
      await document.fonts.load("700 12px Cairo");
    } catch { /* fallback font */ }
    await document.fonts.ready;
  }
}

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Arabic/RTL catering document. Arabic text can't be shaped by jsPDF's built-in
 * fonts, so — like ManualPdfArabicExporter — the page is laid out as RTL HTML
 * and rasterised with html2canvas before being placed into the PDF.
 */
export async function buildCateringPdfArabic({ type, event, docData, quote, reconciliation, branding }) {
  await ensureArabicFont();
  const s = DOC_STRINGS.ar;
  const title = s.titles[type] || "مستند";
  const brandName = branding?.brand_name || "الضيافة";
  const accent = branding?.primary_color || "#0f172a";

  const meta = buildDocMeta({ type, event, docData, quote, s });
  const rows = buildDocRows({ type, docData, quote, reconciliation, s });

  const lineRows = docData.lines.length
    ? withGroupHeaders(docData.lines)
        .map(
          (l) => l.subtotal !== undefined
            ? `<tr><td colspan="3" style="padding:6px 4px;font-weight:700;border-bottom:1px solid #ccc;">${esc(s.subtotal)}</td><td style="padding:6px 4px;font-weight:700;border-bottom:1px solid #ccc;text-align:left;">${formatCurrency(l.subtotal, true)}</td></tr>`
            : l.header
            ? `<tr><td colspan="4" style="padding:6px 8px;background:#282828;color:#fff;font-weight:700;">${esc(l.header)}</td></tr>`
            : `<tr>
            <td style="padding:6px 4px;border-bottom:1px solid #eee;">${esc(l.name)}</td>
            <td style="padding:6px 4px;border-bottom:1px solid #eee;text-align:left;">${esc(l.quantity || 1)}</td>
            <td style="padding:6px 4px;border-bottom:1px solid #eee;text-align:left;">${formatCurrency(l.unit_price || 0, true)}</td>
            <td style="padding:6px 4px;border-bottom:1px solid #eee;text-align:left;">${formatCurrency(l.line_total || 0, true)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="4" style="padding:10px 4px;color:#999;">${s.noLines}</td></tr>`;

  const totalRows = rows
    .map(
      ([label, amount]) => `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px;">
        <span style="color:#5a5a5a;">${esc(label)}</span><span>${formatCurrency(amount, true)}</span></div>`
    )
    .join("");

  const balance = docData.total - docData.paid;
  const paidRow =
    type !== "quotation" && type !== "credit_note"
      ? `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:13px;">
          <span style="color:#5a5a5a;">${s.receivedToDate}</span><span>${formatCurrency(docData.paid, true)}</span></div>`
      : "";
  const balanceRow =
    type === "invoice" || type === "final_invoice"
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px;font-weight:700;">
          <span>${balance < 0 ? s.refundOwed : s.balanceDue}</span><span>${formatCurrency(Math.abs(balance), true)}</span></div>`
      : "";

  const html = `<div style="width:${PAGE_W}px;min-height:${PAGE_H}px;box-sizing:border-box;padding:40px 48px;background:#fff;
      font-family:'Cairo','Tahoma','Segoe UI',sans-serif;direction:rtl;text-align:right;color:#111;display:flex;flex-direction:column;">
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${accent};padding-bottom:10px;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${branding?.logo_url ? `<img src="${esc(branding.logo_url)}" style="height:46px;width:auto;max-width:120px;" />` : ""}
        <span style="font-size:22px;font-weight:700;color:${accent};">${esc(brandName)}</span>
      </div>
      <span style="font-size:19px;font-weight:700;color:#3c3c3c;">${title}</span>
    </div>

    <div style="margin-top:14px;font-size:12.5px;color:#5a5a5a;line-height:1.9;">
      ${meta.map((m) => `<div>${esc(m)}</div>`).join("")}
    </div>

    ${type === "quotation" && quote?.package_description ? `<div style="margin-top:14px;font-size:13px;"><div style="font-weight:700;">${s.packageDetails}</div><div style="white-space:pre-line;color:#333;line-height:1.8;">${esc(quote.package_description)}</div></div>` : ""}
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px;">
      <thead><tr style="background:#f5f6f8;">
        <th style="padding:7px 4px;text-align:right;font-weight:700;">${s.description}</th>
        <th style="padding:7px 4px;text-align:left;font-weight:700;width:70px;">${s.qty}</th>
        <th style="padding:7px 4px;text-align:left;font-weight:700;width:110px;">${s.unit}</th>
        <th style="padding:7px 4px;text-align:left;font-weight:700;width:110px;">${s.lineTotal}</th>
      </tr></thead>
      <tbody>${lineRows}</tbody>
    </table>

    <div style="margin-top:18px;margin-right:auto;width:340px;">
      ${totalRows}
      <div style="display:flex;justify-content:space-between;padding:6px 0;margin-top:4px;border-top:2px solid ${accent};font-size:15px;font-weight:700;">
        <span>${type === "credit_note" ? s.credited : s.total}</span><span>${formatCurrency(docData.total, true)}</span>
      </div>
      ${paidRow}${balanceRow}
    </div>

    ${type === "quotation" ? "" : `<div style="margin-top:auto;padding-top:24px;border-top:1px solid #ddd;font-size:10.5px;color:#8a8a8a;">${s.footer}</div>`}
  </div>`;

  const container = document.createElement("div");
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px;background:#fff;`;
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 50));
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: PAGE_W,
      windowWidth: PAGE_W,
      logging: false,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    // Long documents spill onto extra pages by shifting the same image upward.
    let remaining = imgH;
    let offset = 0;
    while (remaining > 0) {
      if (offset > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -offset, pageWidth, imgH);
      remaining -= pageHeight;
      offset += pageHeight;
    }

    return { pdf, filename: `${type}_${docData.number}_AR.pdf` };
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadCateringPdfArabic(args) {
  const { pdf, filename } = await buildCateringPdfArabic(args);
  pdf.save(filename);
}