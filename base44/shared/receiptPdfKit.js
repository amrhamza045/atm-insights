/**
 * Drawing helpers for the A4 client receipt. Positions are measured from the
 * reading start edge (left in English, right in Arabic), so one layout serves
 * both directions; `draw` takes a physical box for things that never mirror.
 */
import { rgb } from 'npm:pdf-lib@1.17.1';
import { visualRuns, textWidth, drawRuns, wrapText, fitText } from './pdfBidi.js';

export const W = 595.28, H = 841.89, M = 40, CW = W - 2 * M, FOOT = 40;
export const INK = rgb(0.07, 0.09, 0.15), MUTED = rgb(0.4, 0.43, 0.48), LINE = rgb(0.87, 0.88, 0.9), SOFT = rgb(0.965, 0.968, 0.975);

export function hexColor(value, fallback = '#0b2647') {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(value || '').trim()) || /^#?([0-9a-f]{6})$/i.exec(fallback);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** The colour mixed with white: k = 0.9 keeps 10% of it. */
export const tint = (c, k) => rgb(c.red + (1 - c.red) * k, c.green + (1 - c.green) * k, c.blue + (1 - c.blue) * k);

export function createSheet(pdf, { regular, bold }, rtl) {
  const s = { pdf, rtl, regular, bold, page: null, y: M, onPage: null };
  s.newPage = () => {
    s.page = pdf.addPage([W, H]);
    s.y = M + 14;
    s.onPage?.();
  };
  // Starts a new page when the next block wouldn't fit above the footer.
  s.ensure = (height) => { if (s.y + height > H - M - FOOT) s.newPage(); };
  s.left = (at, width) => (rtl ? W - M - at - width : M + at);
  s.draw = (value, { x, width, y = s.y, size = 10, isBold = false, color = INK, align = 'left' }) => {
    const font = isBold ? bold : regular;
    const runs = visualRuns(fitText(font, size, value, width, rtl), rtl);
    const w = textWidth(font, size, runs);
    const left = align === 'left' ? x : align === 'right' ? x + width - w : x + (width - w) / 2;
    drawRuns(s.page, runs, { x: left, y: H - y, size, font, color });
  };
  s.text = (value, { at = 0, width = CW, align = 'start', bold: isBold = false, ...rest } = {}) => {
    const side = align === 'center' ? 'center' : (align === 'start') !== rtl ? 'left' : 'right';
    s.draw(value, { x: s.left(at, width), width, align: side, isBold, ...rest });
  };
  s.lines = (value, { at = 0, width = CW, size = 9.5, bold: isBold = false, color = MUTED, gap = 1.5 } = {}) => {
    for (const line of wrapText(isBold ? bold : regular, size, value, width, rtl)) {
      s.ensure(size * gap);
      s.y += size * gap;
      if (line) s.text(line, { at, width, size, bold: isBold, color });
    }
  };
  s.box = ({ at = 0, width = CW, top = s.y, height, fill, border }) => s.page.drawRectangle({
    x: s.left(at, width), y: H - top - height, width, height,
    ...(fill ? { color: fill } : {}), ...(border ? { borderColor: border, borderWidth: 0.75 } : {}),
  });
  s.rule = ({ y = s.y, at = 0, width = CW, color = LINE, thickness = 0.6 } = {}) => {
    const x = s.left(at, width);
    s.page.drawLine({ start: { x, y: H - y }, end: { x: x + width, y: H - y }, thickness, color });
  };
  return s;
}