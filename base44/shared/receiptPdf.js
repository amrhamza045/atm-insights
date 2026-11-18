/**
 * The client receipt PDF, laid out from Catering › Settings › Client Receipt.
 * The logo keeps its chosen side in both languages; everything else follows
 * the reading direction (Arabic reads from the right).
 */
import { PDFDocument, rgb, degrees } from 'npm:pdf-lib@1.17.1';
import pdfFontkit from 'npm:@pdf-lib/fontkit@1.1.1';
import { W, H, M, CW, FOOT, INK, MUTED, LINE, SOFT, hexColor, tint, createSheet } from './receiptPdfKit.js';
import { visualRuns, wrapText } from './pdfBidi.js';
import { RECEIPT_LABELS, money, formatWhen, typeLabel } from './receiptLabels.js';
import { fillReceiptTemplate } from './receiptSettings.js';
import { receiptVars } from './receiptData.js';

async function embedImage(pdf, bytes) {
  try {
    if (bytes?.[0] === 0x89 && bytes[1] === 0x50) return await pdf.embedPng(bytes);
    if (bytes?.[0] === 0xff && bytes[1] === 0xd8) return await pdf.embedJpg(bytes);
  } catch { /* an unreadable logo: the receipt goes without it */ }
  return null;
}

function header(s, { data, cfg, brand, logo, accent, L, lang, title, details }) {
  const logoLeft = cfg.logo_position !== 'right';
  let logoW = 0, logoH = 0;
  if (logo) {
    const k = Math.min(150 / logo.width, 60 / logo.height);
    logoW = logo.width * k;
    logoH = logo.height * k;
    s.page.drawImage(logo, { x: logoLeft ? M : W - M - logoW, y: H - M - logoH, width: logoW, height: logoH });
  }
  // The business name and contact lines sit across from the logo, on that side.
  const box = { x: logoLeft ? M + logoW + 24 : M, width: CW - logoW - 24, align: logoLeft ? 'right' : 'left' };
  let y = M;
  if (cfg.show_brand_name && brand.name) { y += 17; s.draw(brand.name, { ...box, y, size: 16, isBold: true, color: accent }); }
  const contact = [...(cfg.show_business_contact ? brand.contact : []), ...details.split('\n')].map((t) => t.trim()).filter(Boolean);
  for (const line of contact) { y += 12.5; s.draw(line, { ...box, y, size: 8.5, color: MUTED }); }
  const top = Math.max(M + logoH, y + 4) + 16, band = 44;
  s.box({ top, height: band, fill: tint(accent, 0.9) });
  s.box({ width: 4, top, height: band, fill: accent });
  s.text(title, { at: 16, width: CW * 0.55, y: top + 28, size: 17, bold: true, color: accent });
  const end = { at: CW * 0.55, width: CW * 0.45 - 14, align: 'end' };
  s.text(`${L.receiptNo}: ${data.number}`, { ...end, y: top + 19, size: 9.5, bold: true });
  s.text(`${L.date}: ${formatWhen(data.issuedAt, lang, data.offset, false)}`, { ...end, y: top + 33, size: 9, color: MUTED });
  s.y = top + band + 24;
}

function parties(s, { data, cfg, L, lang }) {
  const width = (CW - 24) / 2, top = s.y;
  const column = (at, label, title, lines) => {
    let y = top;
    s.text(label, { at, width, y, size: 8.5, bold: true, color: MUTED });
    y += 16;
    s.text(title || '-', { at, width, y, size: 12, bold: true });
    for (const line of lines.filter(Boolean)) { y += 13.5; s.text(line, { at, width, y, size: 9.5, color: MUTED }); }
    return y;
  };
  const { client: c, event: e } = data;
  const when = [formatWhen(e.date, lang, data.offset, false), e.time].filter(Boolean).join('   ');
  const a = column(0, L.receivedFrom, c.name, cfg.show_client_contact ? [c.phone, c.email] : []);
  const b = column(width + 24, L.event, e.name, cfg.show_event_details ? [when, e.venue || (e.onSite ? L.onSite : ''), e.guests ? L.guests(e.guests) : ''] : []);
  s.y = Math.max(a, b) + 30;
}

function amountBox(s, { data, cfg, L, lang, accent }) {
  const p = data.payment;
  const rows = cfg.show_payment_details ? [
    [L.paymentFor, typeLabel(p.type, lang)],
    [L.method, p.method],
    p.reference ? [L.reference, p.reference] : null,
    [L.paymentDate, formatWhen(p.paidAt, lang, data.offset)],
    cfg.show_approval && p.approvedAt ? [L.approvedOn, formatWhen(p.approvedAt, lang, data.offset)] : null,
  ].filter(Boolean) : [];
  const height = Math.max(78, 24 + rows.length * 16);
  s.ensure(height);
  const top = s.y - 14, split = rows.length ? CW * 0.4 : CW;
  s.box({ top, height, fill: SOFT, border: LINE });
  s.text(L.amountReceived, { at: 16, width: split - 24, y: top + 24, size: 9, color: MUTED });
  s.text(money(Math.abs(p.amount)), { at: 16, width: split - 24, y: top + 50, size: 21, bold: true, color: accent });
  if (!rows.length) s.text(typeLabel(p.type, lang), { at: 16, width: split - 24, y: top + 66, size: 9.5 });
  if (rows.length) {
    const x = s.left(split, 0), at = split + 14, width = CW - split - 30;
    s.page.drawLine({ start: { x, y: H - top - 12 }, end: { x, y: H - top - height + 12 }, thickness: 0.6, color: LINE });
    rows.forEach(([label, value], i) => {
      const y = top + 22 + i * 16;
      s.text(label, { at, width: width * 0.4, y, size: 9, color: MUTED });
      s.text(value || '-', { at: at + width * 0.4, width: width * 0.6, y, size: 9.5, bold: true, align: 'end' });
    });
  }
  s.y = top + height + 30;
}

function summary(s, { data, L, accent }) {
  const t = data.totals, gap = 10, width = (CW - gap * 2) / 3, height = 54;
  s.ensure(height);
  const top = s.y - 14, credit = t.remaining < 0;
  [[L.eventTotal, t.eventTotal], [L.totalPaid, t.totalPaid], [credit ? L.credit : L.remaining, Math.abs(t.remaining)]].forEach(([label, value], i) => {
    const at = i * (width + gap), last = i === 2;
    s.box({ at, width, top, height, fill: last ? tint(accent, 0.9) : undefined, border: last ? tint(accent, 0.55) : LINE });
    s.text(label, { at: at + 12, width: width - 24, y: top + 21, size: 8.5, color: MUTED });
    s.text(money(value), { at: at + 12, width: width - 24, y: top + 41, size: 13, bold: true, color: last ? accent : INK });
  });
  s.y = top + height + 34;
}

const COLUMNS = [['date', 0, 88], ['type', 88, 104], ['method', 192, 104], ['reference', 296, 112], ['amount', 408, CW - 408]];

function history(s, { data, L, lang, accent }) {
  s.ensure(70);
  s.text(L.history, { size: 11, bold: true });
  s.y += 10;
  const cells = (values, style) => COLUMNS.forEach(([key, at, width]) =>
    s.text(values[key], { at: at + 8, width: width - 16, y: s.y + 13.5, align: key === 'amount' ? 'end' : 'start', ...style }));
  const head = () => {
    s.box({ top: s.y, height: 20, fill: SOFT });
    cells({ date: L.date, type: L.payment, method: L.method, reference: L.reference, amount: L.amount }, { size: 8.5, bold: true, color: MUTED });
    s.y += 20;
  };
  head();
  s.onPage = head;
  for (const h of data.history) {
    s.ensure(20);
    if (h.current) s.box({ top: s.y, height: 20, fill: tint(accent, 0.92) });
    cells({ date: formatWhen(h.paidAt, lang, data.offset, false), type: typeLabel(h.type, lang), method: h.method || '-', reference: h.reference || '-', amount: money(h.amount) }, { size: 9, bold: h.current });
    s.y += 20;
    s.rule();
  }
  s.onPage = null;
  s.ensure(24);
  s.y += 17;
  s.text(L.totalPaid, { at: COLUMNS[3][1] + 8, width: COLUMNS[3][2] - 16, size: 9.5, bold: true, align: 'end' });
  s.text(money(data.totals.totalPaid), { at: COLUMNS[4][1] + 8, width: COLUMNS[4][2] - 16, size: 10, bold: true, color: accent, align: 'end' });
  s.y += 14;
}

function signature(s, label) {
  s.ensure(80);
  s.y += 54;
  const width = 180, at = CW - width;
  s.rule({ at, width, color: INK, thickness: 0.8 });
  s.text(label, { at, width, y: s.y + 14, size: 9, color: MUTED, align: 'center' });
  s.y += 20;
}

function footers(s, { text, L }) {
  const pages = s.pdf.getPages();
  pages.forEach((page, i) => {
    s.page = page;
    const y = H - M - FOOT + 14;
    s.rule({ y });
    wrapText(s.regular, 8, text, CW - 100, s.rtl).slice(0, 2)
      .forEach((line, j) => s.text(line, { width: CW - 100, y: y + 13 + j * 11, size: 8, color: MUTED }));
    s.text(L.page(i + 1, pages.length), { at: CW - 90, width: 90, y: y + 13, size: 8, color: MUTED, align: 'end' });
  });
}

/** Returns the PDF bytes for one language ("en" or "ar"). */
export async function renderReceiptPdf({ lang, data, settings: cfg, brand, logoBytes, fonts }) {
  const L = RECEIPT_LABELS[lang];
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(pdfFontkit);
  const [regular, bold] = await Promise.all([pdf.embedFont(fonts.regular, { subset: true }), pdf.embedFont(fonts.bold, { subset: true })]);
  const logo = cfg.show_logo && logoBytes ? await embedImage(pdf, logoBytes) : null;
  const accent = hexColor(cfg.accent_color || brand.color);
  const vars = receiptVars(data, lang, brand.name);
  const fill = (key) => fillReceiptTemplate(cfg[`${key}_${lang}`], vars).trim();
  const s = createSheet(pdf, { regular, bold }, lang === 'ar');
  s.newPage();
  if (data.sample) {
    const [mark] = visualRuns(L.sample, s.rtl);
    s.page.drawText(mark, { x: 150, y: 250, size: 90, font: bold, color: rgb(0.94, 0.945, 0.95), rotate: degrees(35) });
  }
  header(s, { data, cfg, brand, logo, accent, L, lang, title: fill('pdf_title'), details: fill('header_details') });
  parties(s, { data, cfg, L, lang });
  amountBox(s, { data, cfg, L, lang, accent });
  if (cfg.show_balance_summary) summary(s, { data, L, accent });
  if (cfg.show_payment_history && data.history.length) history(s, { data, L, lang, accent });
  const notes = fill('notes');
  if (notes) { s.y += 8; s.lines(notes); }
  if (cfg.show_signature) signature(s, fill('signature_label'));
  footers(s, { text: fill('footer'), L });
  pdf.setTitle(`${fill('pdf_title')} ${data.number}`);
  return await pdf.save();
}