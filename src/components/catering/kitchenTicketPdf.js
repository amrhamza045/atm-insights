import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";

// Kitchen Batch Ticket: items + quantities only. With `priced`, the same layout
// adds line totals, collapses packages and appends the financial summary.
const CREAM = [246, 241, 232], INK = [37, 42, 39], SAND = [201, 185, 155], SAGE = [119, 128, 110], MUTED = [215, 201, 173];
const money = (n) => `${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
const lineTotal = (li) => Number(li.line_total) || (Number(li.quantity) || 0) * (Number(li.unit_price) || 0) - (Number(li.discount_amount) || 0);

async function toDataUrl(url) {
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  } catch { return null; }
}

// Logo scaled to fit a box while keeping its aspect ratio.
async function fitLogo(url, maxW, maxH) {
  const data = await toDataUrl(url);
  if (!data) return null;
  const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = data; });
  if (!img?.width) return null;
  const s = Math.min(maxW / img.width, maxH / img.height);
  return { data, w: img.width * s, h: img.height * s };
}

// Package lines (tagged via description) collapse into one row; others stay as-is.
function ticketRows(quote, priced) {
  const items = quote.line_items || [];
  if (!priced) return items.map((li) => ({ name: li.name, note: li.kitchen_note, qty: li.quantity }));
  const rows = [];
  // Descriptions are joined per package in the order added; match by index when counts line up.
  const pkgCount = new Set(items.map((li) => li.description).filter(Boolean)).size;
  const parts = String(quote.package_description || "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  let pkgIdx = 0;
  items.forEach((li) => {
    const tag = li.description || "";
    const last = rows[rows.length - 1];
    if (tag && last?.tag === tag) { last.total += lineTotal(li); return; }
    if (tag) {
      const pax = tag.match(/·\s*(\d+)/)?.[1];
      rows.push({ tag, name: tag.split("·")[0].trim(), note: parts.length === pkgCount ? parts[pkgIdx] : quote.package_description, qty: pax ? `${pax} pers.` : "", total: lineTotal(li) });
      pkgIdx++;
    } else rows.push({ name: li.name, note: li.kitchen_note, qty: li.quantity, total: lineTotal(li) });
  });
  return rows;
}

export async function buildKitchenTicketPdf({ event, quote, client, branding, priced = false }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 12;
  const paint = () => { doc.setFillColor(...CREAM); doc.rect(0, 0, W, H, "F"); };
  paint();

  // Header band
  const logo = await fitLogo(branding?.landing_logo_url || branding?.logo_url, 45, 18);
  const contact = ["New Cairo", branding?.email, branding?.phone].filter(Boolean);
  const bandH = 44;
  doc.setFillColor(...INK); doc.rect(M, M, W - 2 * M, bandH, "F");
  let y = M + 7;
  if (logo) { try { doc.addImage(logo.data, "PNG", M + 5, y - 2, logo.w, logo.h); y += logo.h + 2; } catch { /* optional */ } }
  doc.setFont("helvetica", "bold"); doc.setTextColor(...CREAM);
  if (!logo) { doc.setFontSize(14); doc.text(branding?.brand_name || "Rosemary Catering", M + 5, y + 3); y += 8; }
  doc.setFontSize(8); doc.setTextColor(...MUTED);
  contact.forEach((c) => { doc.text(String(c), M + 5, y); y += 4.5; });

  const rx = W - M - 5;
  doc.setFontSize(9); doc.setTextColor(...SAND);
  doc.text(priced ? "QUOTATION" : "KITCHEN BATCH TICKET", rx, M + 8, { align: "right" });
  doc.setFontSize(13); doc.setTextColor(...CREAM);
  doc.text(String(event.event_name || ""), rx, M + 16, { align: "right", maxWidth: 95 });
  doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  [event.event_date, event.event_code, `Quote ${quote.revision_number || ""}`].filter(Boolean).forEach((t, i) => doc.text(String(t), rx, M + 24 + i * 5, { align: "right" }));
  doc.setFillColor(...SAND); doc.rect(M + 5, M + bandH - 0.8, W - 2 * M - 10, 0.8, "F");

  // Client line
  y = M + bandH + 9;
  const fields = [["CLIENT", event.client_name], ["NUMBER", client?.phone || event.client_phone], ["EMAIL", client?.email], ["GUESTS", event.expected_guests]];
  const cw = (W - 2 * M) / 4;
  fields.forEach(([l, v], i) => {
    doc.setFontSize(7); doc.setTextColor(...SAGE); doc.text(l, M + 1 + i * cw, y);
    doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(String(v ?? "—"), M + 1 + i * cw, y + 5, { maxWidth: cw - 3 });
  });
  y += 11; doc.setDrawColor(216, 208, 195); doc.line(M, y, W - M, y);

  const nameW = W - 2 * M - (priced ? 70 : 34);
  const qtyX = priced ? W - M - 60 : W - M - 24;
  const tableHead = () => {
    y += 8; doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...SAGE);
    doc.text("ITEM & DESCRIPTION", M + 1, y); doc.text("QTY", qtyX + 11.5, y, { align: "center" });
    if (priced) doc.text("TOTAL", W - M - 1, y, { align: "right" });
    y += 3; doc.setDrawColor(...SAND); doc.line(M, y, W - M, y);
  };
  tableHead();

  ticketRows(quote, priced).forEach((r) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    const lines = doc.splitTextToSize(String(r.name || ""), nameW);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const extra = r.note ? doc.splitTextToSize(String(r.note), nameW) : [];
    const h = Math.max(12, lines.length * 5 + extra.length * 4 + 6);
    if (y + h > H - 18) { doc.addPage(); paint(); y = M; tableHead(); }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
    doc.text(lines, M + 1, y + 7);
    if (extra.length) { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...SAGE); doc.text(extra, M + 1, y + 7 + lines.length * 5); }
    if (r.qty !== "" && r.qty != null) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(priced ? 9 : 11); doc.setTextColor(...INK);
      doc.text(String(r.qty), qtyX + 11.5, y + 8, { align: "center" });
    }
    if (priced) { doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...INK); doc.text(money(r.total), W - M - 1, y + 8, { align: "right" }); }
    y += h; doc.setDrawColor(216, 208, 195); doc.line(M, y, W - M, y);
  });

  if (priced) {
    const rows = [
      ["Subtotal", quote.subtotal],
      Number(quote.line_discount_total) > 0 && ["Line discounts (included)", -quote.line_discount_total],
      Number(quote.service_charge_total) > 0 && [`Service (${quote.service_charge_rate || 0}%)`, quote.service_charge_total],
      Number(quote.tax_total) > 0 && [`Tax (${quote.tax_rate || 0}%)`, quote.tax_total],
      Number(quote.discount_amount) > 0 && ["Discount", -quote.discount_amount],
    ].filter(Boolean);
    const need = rows.length * 6 + 26;
    if (y + need > H - 12) { doc.addPage(); paint(); y = M; }
    y += 8; const lx = W - M - 85;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    rows.forEach(([l, v]) => { doc.setTextColor(...SAGE); doc.text(l, lx, y); doc.setTextColor(...INK); doc.text((v < 0 ? "- " : "") + money(Math.abs(v)), W - M - 1, y, { align: "right" }); y += 6; });
    doc.setFillColor(...INK); doc.rect(lx - 3, y - 2, W - M - lx + 3, 10, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...CREAM);
    doc.text("TOTAL", lx, y + 4.5); doc.text(money(quote.total), W - M - 2, y + 4.5, { align: "right" });
    y += 14; doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...SAGE);
    doc.text(`Required deposit (${quote.deposit_percentage ?? 50}%)`, lx, y); doc.setTextColor(...INK); doc.text(money(quote.required_deposit), W - M - 1, y, { align: "right" });
  }

  const code = (event.event_code || event.event_name || "event").replace(/\s+/g, "_");
  return { pdf: doc, filename: `${priced ? "Quotation" : "Kitchen_Ticket"}_${code}.pdf` };
}

/** Loads branding + client and builds the ticket (priced = client quotation version). */
export async function loadTicketPdf(event, quote, priced = false) {
  const [info, clients] = await Promise.all([
    base44.entities.RestaurantInfo.list(),
    event.client_id ? base44.entities.Client.filter({ id: event.client_id }) : Promise.resolve([]),
  ]);
  return buildKitchenTicketPdf({ event, quote, client: clients[0], branding: info[0], priced });
}