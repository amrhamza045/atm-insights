import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const FOOTER_TEXT_AR = {
  poweredBy: "مدعوم بواسطة",
};

const SECTION_META_AR = [
  { key: "description", title: "الوصف" },
  { key: "benefits_and_features", title: "المزايا والمميزات" },
  { key: "max_benefit_strategy", title: "كيف تحصل على أقصى استفادة" },
  { key: "cautions", title: "تحذيرات يجب تجنبها" },
  { key: "required_accurate_data", title: "البيانات المطلوبة بدقة" },
  { key: "usage_guide", title: "دليل الاستخدام الكامل" },
  { key: "finance_integration", title: "الربط مع المالية" },
];

function markdownToHTML(text) {
  if (!text) return "";
  let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");
  html = html.replace(/^#{1,6}\s+/gm, "");
  html = html.replace(/^\s*[-*]\s+/gm, "• ");
  html = html.replace(/^\s*>\s+/gm, "");
  html = html.replace(/\[(.+?)\]\(.+?\)/g, "$1");
  return html;
}

function hasContent(text) {
  if (!text) return false;
  return text.replace(/[#*`>\[\]()\-_\s]/g, "").trim().length > 0;
}

async function fetchImageAsDataURL(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

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
      await document.fonts.load("600 12px Cairo");
      await document.fonts.load("700 12px Cairo");
    } catch (e) { /* continue with fallback */ }
    await document.fonts.ready;
  }
}

export async function exportArabicPDF(sections, t, verakitLogo, veragatesLogo, includeScreenshots = true, vendorContact = {}) {
  await ensureArabicFont();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;

  // A4 at ~96 DPI
  const PAGE_W = 794;
  const PAGE_H = 1123;
  const HEADER_H = 65;
  const FOOTER_H = 70;
  const CONTENT_H = PAGE_H - HEADER_H - FOOTER_H;
  const PADDING = 40;

  const ft = { ...FOOTER_TEXT_AR, ...vendorContact };
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
    : SECTION_META_AR;

  // Off-screen rendering container
  const container = document.createElement("div");
  container.style.cssText = `position: fixed; left: -10000px; top: 0; width: ${PAGE_W}px; background: #ffffff;`;
  document.body.appendChild(container);

  let firstPageUsed = false;

  function addCanvasAsPage(canvas) {
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    if (firstPageUsed) doc.addPage();
    firstPageUsed = true;
    doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
  }

  function headerHTML() {
    if (!verakitLogo) return `<div style="height:${HEADER_H - 10}px;border-bottom:2px solid #002855;"></div>`;
    return `<div style="text-align:center;padding:8px 0;border-bottom:2px solid #002855;"><img src="${verakitLogo}" style="height:40px;width:auto;max-width:120px;" /></div>`;
  }

  function footerHTML() {
    const hubLogoHTML = veragatesLogo
      ? `<img src="${veragatesLogo}" style="height:24px;width:auto;max-width:80px;margin-top:2px;" />`
      : "";
    return `<div style="border-top:1px solid #008080;padding:6px ${PADDING}px 0;display:flex;justify-content:space-between;align-items:flex-start;">
      <div style="text-align:right;"><div style="font-size:9px;color:#888;">${ft.poweredBy}</div>${hubLogoHTML}</div>
      <div style="text-align:left;font-size:9px;color:#777;line-height:1.6;">
        ${[ft.website, ft.email, ft.mobile].filter(Boolean).map((l) => `<div>${l}</div>`).join("")}
      </div></div>`;
  }

  function buildPage(contentHTML) {
    return `<div style="width:${PAGE_W}px;min-height:${PAGE_H}px;display:flex;flex-direction:column;background:#ffffff;font-family:'Cairo','Tahoma','Segoe UI',sans-serif;direction:rtl;text-align:right;">
      <div style="height:${HEADER_H}px;flex-shrink:0;">${headerHTML()}</div>
      <div style="flex:1;padding:12px ${PADDING}px;overflow:hidden;">${contentHTML}</div>
      <div style="height:${FOOTER_H}px;flex-shrink:0;">${footerHTML()}</div>
    </div>`;
  }

  async function renderContainer(innerHTML) {
    container.innerHTML = innerHTML;
    await new Promise((r) => setTimeout(r, 30));
    return html2canvas(container, {
      scale: 2, useCORS: true, backgroundColor: "#ffffff",
      width: PAGE_W, windowWidth: PAGE_W, logging: false,
    });
  }

  async function addContentPages(contentHTML) {
    const fullCanvas = await renderContainer(buildPage(contentHTML));
    const s = 2;
    const W = PAGE_W * s;
    const pageHPx = PAGE_H * s;
    const headerHPx = HEADER_H * s;
    const footerHPx = FOOTER_H * s;
    const contentHPx = CONTENT_H * s;
    const totalHPx = fullCanvas.height;
    const contentEndPx = totalHPx - footerHPx;

    let offset = headerHPx;
    while (offset < contentEndPx) {
      const sliceH = Math.min(contentHPx, contentEndPx - offset);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = W;
      pageCanvas.height = pageHPx;
      const ctx = pageCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, pageHPx);
      ctx.drawImage(fullCanvas, 0, 0, W, headerHPx, 0, 0, W, headerHPx);
      ctx.drawImage(fullCanvas, 0, offset, W, sliceH, 0, headerHPx, W, sliceH);
      ctx.drawImage(fullCanvas, 0, contentEndPx, W, footerHPx, 0, pageHPx - footerHPx, W, footerHPx);
      addCanvasAsPage(pageCanvas);
      offset += sliceH;
    }
  }

  // ── Cover page ──
  const coverHTML = `<div style="width:${PAGE_W}px;min-height:${PAGE_H}px;display:flex;align-items:center;justify-content:center;background:#ffffff;font-family:'Cairo','Tahoma',sans-serif;direction:rtl;">
    <div style="text-align:center;">
      ${verakitLogo ? `<img src="${verakitLogo}" style="width:200px;height:auto;margin-bottom:25px;" />` : ""}
      <h1 style="font-size:32px;color:#002855;margin:0;font-weight:700;">${t?.title || "دليل Vera F&B Ops"}</h1>
      <p style="font-size:14px;color:#666;margin-top:12px;">${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
      <p style="font-size:13px;color:#999;margin-top:5px;">${sections.length} وحدة</p>
    </div></div>`;
  addCanvasAsPage(await renderContainer(coverHTML));

  // ── Table of contents ──
  let tocHTML = `<h2 style="text-align:center;font-size:22px;color:#002855;margin:0 0 15px 0;font-weight:700;">فهرس المحتويات</h2>`;
  const cats = [];
  sections.forEach((s) => { if (!cats.includes(s.category)) cats.push(s.category); });
  cats.forEach((cat) => {
    const catModules = sections.filter((s) => s.category === cat);
    tocHTML += `<div style="margin-bottom:8px;"><div style="font-weight:700;font-size:13px;color:#008080;">${cat}</div>`;
    catModules.forEach((m) => {
      tocHTML += `<div style="font-size:11px;color:#555;padding-right:12px;line-height:1.6;">• ${m.module_name}</div>`;
    });
    tocHTML += `</div>`;
  });
  await addContentPages(tocHTML);

  // ── Module pages ──
  for (const section of sections) {
    let moduleHTML = `<h1 style="font-size:20px;color:#002855;text-align:center;margin:0 0 4px 0;font-weight:700;">${section.module_name}</h1>
      <div style="text-align:center;font-size:11px;color:#888;margin-bottom:8px;">${[section.chapter_code, section.category, section.chapter].filter(Boolean).join("  ·  ")}</div>
      <hr style="border:none;border-top:1px solid #ddd;margin:0 0 8px 0;" />`;
    // Inline screenshots
    if (includeScreenshots && section.screenshot_urls?.length > 0) {
      for (const url of section.screenshot_urls) {
        const dataUrl = await fetchImageAsDataURL(url);
        if (dataUrl) {
          moduleHTML += `<img src="${dataUrl}" style="width:100%;border:1px solid #ddd;border-radius:4px;margin-bottom:8px;" />`;
        }
      }
    }
    sectionMeta.forEach(({ key, title }) => {
      if (!hasContent(section[key])) return;
      moduleHTML += `<h3 style="font-size:14px;color:#008080;margin:10px 0 4px 0;font-weight:600;border-right:3px solid #008080;padding-right:8px;">${title}</h3>
        <div style="font-size:11px;color:#444;line-height:1.8;white-space:pre-wrap;">${markdownToHTML(section[key])}</div>`;
    });
    await addContentPages(moduleHTML);
  }

  document.body.removeChild(container);
  doc.save("VeraFBOps_Manual_AR.pdf");
}