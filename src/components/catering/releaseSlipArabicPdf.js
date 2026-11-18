import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";
import { translateToArabic } from "@/components/i18n/translateToArabic";

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const ROWS_PER_PAGE = 12;
const safeName = (value) => String(value || "release-slip").replace(/[^a-z0-9_-]+/gi, "-");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const statusLabel = { open: "مفتوح", fulfilled: "تم الصرف", void: "ملغي" };
const purposeLabel = { stock_pull: "صرف مباشر من المخزون", production_input: "مدخل إنتاج" };

async function getBrandLogo(slip) {
  const branchRows = slip.branch_id
    ? await base44.entities.RestaurantInfo.filter({ branch_id: slip.branch_id })
    : [];
  const info = branchRows[0] || (await base44.entities.RestaurantInfo.list("-created_date", 1))[0];
  if (!info?.logo_url) return null;
  const response = await fetch(info.logo_url);
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function loadArabicFont() {
  const href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap";
  if (!document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  if (document.fonts) {
    await document.fonts.load("400 12px Cairo");
    await document.fonts.load("700 12px Cairo");
    await document.fonts.ready;
  }
}

function lineHtml(line, index) {
  const unit = escapeHtml(line.unit || "");
  return `<tr style="page-break-inside:avoid">
    <td>${index + 1}</td>
    <td><strong>${escapeHtml(line.inventory_item_name || "مادة")}</strong>${line.produced_item_name ? `<div class="muted">لإنتاج: ${escapeHtml(line.produced_item_name)}</div>` : ""}</td>
    <td>${purposeLabel[line.purpose] || escapeHtml(line.purpose)}</td>
    <td><span dir="ltr">${Number(line.quantity_reserved) || 0} ${unit}</span></td>
    <td class="${Number(line.shortfall_quantity) > 0 ? "short" : ""}"><span dir="ltr">${Number(line.shortfall_quantity) || 0} ${unit}</span></td>
    <td><span dir="ltr">${line.actual_quantity == null ? "—" : `${Number(line.actual_quantity) || 0} ${unit}`}</span></td>
  </tr>`;
}

function pageHtml(slip, lines, page, totalPages, startIndex, logoData) {
  const date = escapeHtml(slip.needed_by_date || slip.event_date || "-");
  const isLastPage = page === totalPages;
  return `<section class="page" dir="rtl">
    <header><div class="brand">${logoData ? `<img src="${logoData}" alt="شعار المطعم" />` : ""}<h1>إذن صرف مواد للمطبخ</h1></div><div class="slip" dir="ltr">${escapeHtml(slip.slip_number)}</div></header>
    <div class="summary">
      <div><span>الفعالية</span><strong>${escapeHtml(slip.event_name || "-")}</strong></div>
      <div><span>تاريخ الاحتياج</span><strong dir="ltr">${date}</strong></div>
      <div><span>الحالة</span><strong>${statusLabel[slip.status] || escapeHtml(slip.status)}</strong></div>
      <div><span>عدد المواد</span><strong>${(slip.lines || []).length}</strong></div>
    </div>
    <table><thead><tr><th>#</th><th>المادة</th><th>الغرض</th><th>الكمية المحجوزة</th><th>العجز</th><th>الكمية المصروفة</th></tr></thead>
      <tbody>${lines.map((line, index) => lineHtml(line, startIndex + index)).join("")}</tbody></table>
    <div class="notes">${slip.fulfilled_by ? `<p>تم الصرف بواسطة: <span dir="ltr">${escapeHtml(slip.fulfilled_by)}</span></p>` : ""}${slip.void_reason ? `<p>سبب الإلغاء: ${escapeHtml(slip.void_reason)}</p>` : ""}</div>
    ${isLastPage ? `<div class="signature"><strong>الاسم والتوقيع</strong><div class="signature-line"></div><span>التاريخ: ....................................</span></div>` : ""}
    <footer><span>تم الإنشاء: <span dir="ltr">${new Date().toLocaleString("ar-EG")}</span></span><span>صفحة ${page} من ${totalPages}</span></footer>
  </section>`;
}

// Manual Arabic name first, then the shared translator, English last.
async function arabicLines(lines) {
  const ids = [...new Set(lines.map((l) => l.inventory_item_id).filter(Boolean))];
  const items = ids.length ? await base44.entities.InventoryItem.filter({ id: { $in: ids } }).catch(() => []) : [];
  const manual = Object.fromEntries((items.items || items || []).filter((i) => i.arabic_name).map((i) => [i.id, i.arabic_name]));
  const auto = await translateToArabic(lines.flatMap((l) => [manual[l.inventory_item_id] ? null : l.inventory_item_name, l.produced_item_name]).filter(Boolean)).catch(() => ({}));
  return lines.map((l) => ({
    ...l,
    inventory_item_name: manual[l.inventory_item_id] || auto[l.inventory_item_name] || l.inventory_item_name,
    produced_item_name: l.produced_item_name ? auto[l.produced_item_name] || l.produced_item_name : l.produced_item_name,
  }));
}

// Render inside an isolated iframe so html2canvas never parses the app's global
// stylesheets (their modern colour syntax was making the rasteriser throw).
async function createFrame() {
  const frame = document.createElement("iframe");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_WIDTH}px;height:${PAGE_HEIGHT}px;border:0`;
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  fdoc.open();
  fdoc.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap"></head><body style="margin:0;background:#fff"><div id="host"></div></body></html>`);
  fdoc.close();
  await new Promise((r) => { const link = fdoc.querySelector("link"); link.onload = r; link.onerror = r; setTimeout(r, 4000); });
  if (fdoc.fonts) {
    await Promise.all([fdoc.fonts.load("400 12px Cairo"), fdoc.fonts.load("700 12px Cairo")]).catch(() => {});
    await fdoc.fonts.ready;
  }
  return { frame, host: fdoc.getElementById("host") };
}

export async function saveArabicReleaseSlipPdf(slip) {
  const logoData = await getBrandLogo(slip).catch(() => null);
  const lines = await arabicLines(slip.lines || []);
  const pageCount = Math.max(1, Math.ceil(lines.length / ROWS_PER_PAGE));
  const { frame, host } = await createFrame();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  try {
    for (let page = 0; page < pageCount; page += 1) {
      const start = page * ROWS_PER_PAGE;
      host.innerHTML = `<style>
        *{box-sizing:border-box} .page{width:${PAGE_WIDTH}px;height:${PAGE_HEIGHT}px;padding:52px 48px 38px;background:#fff;color:#172033;font-family:'Cairo',Tahoma,sans-serif;direction:rtl;text-align:right;display:flex;flex-direction:column}
        header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0f766e;padding-bottom:16px}.brand{display:flex;align-items:center;gap:14px}.brand img{width:70px;height:48px;object-fit:contain}h1{font-size:28px;margin:0}.slip{font-size:16px;font-weight:700;color:#0f766e}
        .summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}.summary div{border:1px solid #d8e0e8;border-radius:8px;padding:10px}.summary span{display:block;color:#64748b;font-size:12px}.summary strong{font-size:14px}
        table{width:100%;border-collapse:collapse;font-size:11px}th{background:#e6fffb;color:#115e59;font-weight:700}th,td{border:1px solid #d8e0e8;padding:9px 7px;vertical-align:top}.muted{color:#64748b;font-size:9px;margin-top:3px}.short{color:#b91c1c;font-weight:700;background:#fef2f2}
        .notes{font-size:11px;margin-top:16px}.notes p{margin:4px 0}.signature{width:280px;margin:18px 0 8px auto;border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:11px}.signature strong{display:block;margin-bottom:22px}.signature-line{border-top:1px solid #64748b;margin-bottom:10px}footer{margin-top:auto;border-top:1px solid #d8e0e8;padding-top:10px;display:flex;justify-content:space-between;color:#64748b;font-size:10px}
      </style>${pageHtml(slip, lines.slice(start, start + ROWS_PER_PAGE), page + 1, pageCount, start, logoData)}`;
      const canvas = await html2canvas(host, { scale: 2, useCORS: true, backgroundColor: "#ffffff", width: PAGE_WIDTH, height: PAGE_HEIGHT, logging: false });
      if (page > 0) doc.addPage();
      doc.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 210, 297);
    }
  } finally {
    document.body.removeChild(frame);
  }

  doc.save(`اذن_صرف_${safeName(slip.slip_number)}.pdf`);
}