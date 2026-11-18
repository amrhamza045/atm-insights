import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// Paged account-statement PDF. Content is rendered as HTML (so Arabic names
// display), captured, then placed on A4 pages using measured positions: a
// section stays together when it fits on one page; a longer one breaks only
// between rows and repeats its column header on the next page.
// accounts: [{ headHtml, sections: [{ titleHtml, columns: [{label, right}], rows: [[cell, …]] }] }]
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const MARGIN = 30, WIDTH = 740, SCALE = 2, CHUNK = 6;
const td = (right) => `padding:5px 6px;border-bottom:1px solid #e5e7eb;${right ? "text-align:right;white-space:nowrap;" : ""}`;

function sectionHtml(s) {
  const head = s.columns.map((c) => `<th style="${td(c.right)}font-weight:600;color:#64748b;background:#f8fafc">${esc(c.label)}</th>`).join("");
  const rows = s.rows.map((r) => `<tr data-row>${r.map((v, i) => `<td style="${td(s.columns[i]?.right)}">${v}</td>`).join("")}</tr>`).join("");
  return `<div data-unit style="padding-bottom:10px"><div style="font-weight:600;font-size:12px;padding:4px 0" dir="auto">${s.titleHtml}</div><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr data-thead>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
const accountHtml = (a) => `<div data-unit data-keep style="padding:14px 0 6px;border-top:2px solid #0b2647">${a.headHtml}</div>${a.sections.map(sectionHtml).join("")}`;

function measure(host) {
  const base = host.getBoundingClientRect().top, end = host.scrollHeight * SCALE;
  const at = (el, edge = "top") => (el.getBoundingClientRect()[edge] - base) * SCALE;
  const units = [...host.querySelectorAll("[data-unit]")];
  return units.map((el, i) => {
    const bottom = i + 1 < units.length ? at(units[i + 1]) : end;
    const rows = [...el.querySelectorAll("[data-row]")].map((r, j, all) => ({ top: at(r), bottom: j + 1 < all.length ? at(all[j + 1]) : bottom }));
    const thead = el.querySelector("[data-thead]");
    return { top: at(el), bottom, keep: el.hasAttribute("data-keep"), rows, head: thead && { top: at(thead), bottom: at(thead, "bottom") } };
  });
}

function pager(pdf) {
  const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
  const k = (pw - 2 * MARGIN) / (WIDTH * SCALE), cap = (ph - 2 * MARGIN) / k;
  let y = 0, canvas = null, pend = null;
  const flush = () => {
    if (!pend) return;
    const h = Math.ceil(pend.bottom - pend.top), part = document.createElement("canvas");
    part.width = canvas.width; part.height = h;
    part.getContext("2d").drawImage(canvas, 0, pend.top, canvas.width, h, 0, 0, canvas.width, h);
    pdf.addImage(part.toDataURL("image/jpeg", 0.9), "JPEG", MARGIN, MARGIN + pend.y * k, pw - 2 * MARGIN, h * k);
    pend = null;
  };
  const room = () => cap - y;
  const newPage = () => { flush(); pdf.addPage(); y = 0; };
  const place = (r) => {
    if (pend && Math.abs(pend.bottom - r.top) < 1) pend.bottom = r.bottom;
    else { flush(); pend = { top: r.top, bottom: r.bottom, y }; }
    y += r.bottom - r.top;
  };
  const placeTall = (r) => { // last resort for a single piece taller than a page
    for (let top = r.top; top < r.bottom; top += cap) { if (room() < 1) newPage(); place({ top, bottom: Math.min(r.bottom, top + Math.min(cap, room())) }); }
  };
  const fit = (u) => (u.rows.length ? Math.min(u.bottom, u.rows[0].bottom) : u.bottom) - u.top;
  return {
    setCanvas: (c) => { flush(); canvas = c; },
    layout(units) {
      units.forEach((u, i) => {
        const h = u.bottom - u.top, next = units[i + 1];
        const need = u.keep && next ? h + Math.min(next.bottom - next.top, fit(next)) : h;
        if (need > room() && y > 0 && need <= cap) newPage();
        if (h <= room()) return place(u);
        if (h <= cap && y > 0) { newPage(); return place(u); }
        if (!u.rows.length) return placeTall(u);
        if (fit(u) > room() && y > 0) newPage();
        place({ top: u.top, bottom: u.rows[0].top });
        u.rows.forEach((r) => {
          if (r.bottom - r.top > room()) { newPage(); if (u.head) place(u.head); }
          place(r);
        });
      });
    },
    flush,
  };
}

export async function saveStatementPdf({ fileName, introHtml, accounts }) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" }), out = pager(pdf);
  for (let i = 0; i < Math.max(accounts.length, 1); i += CHUNK) {
    const host = document.createElement("div");
    host.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;background:#fff;color:#0b2647;font-family:Cairo,Arial,sans-serif;`;
    host.innerHTML = (i === 0 ? `<div data-unit style="padding-bottom:12px">${introHtml}</div>` : "") + accounts.slice(i, i + CHUNK).map(accountHtml).join("");
    document.body.appendChild(host);
    try {
      const units = measure(host);
      out.setCanvas(await html2canvas(host, { scale: SCALE, backgroundColor: "#ffffff" }));
      out.layout(units);
      out.flush();
    } finally {
      host.remove();
    }
  }
  pdf.save(`${fileName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
}