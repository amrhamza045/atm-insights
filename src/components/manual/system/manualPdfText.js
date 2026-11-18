// Rich-text helpers for the jsPDF manual book: turns the manual's inline
// markdown (**bold**, *italic*, `code`) into styled word runs and lays them
// out with word wrapping and automatic page breaks.

const FONT = "helvetica";

// jsPDF's built-in fonts are WinAnsi only: characters outside it (the manual's
// non-breaking hyphens, ellipses, arrows, Arabic digits…) get mis-measured,
// which made text overlap itself. Fold them to safe equivalents first.
const REPLACEMENTS = [
  [/[\u2010\u2011\u2012\u2013\u2212]/g, "-"],
  [/\u2014/g, " - "],
  [/\u2026/g, "..."],
  [/[\u2018\u2019\u201B]/g, "'"],
  [/[\u201C\u201D]/g, '"'],
  [/[\u00a0\u202f\u2009\u200a]/g, " "],
  [/[\u200b\u200c\u200d\ufeff]/g, ""],
  [/[\u25be\u25bc]/g, "v"],
  [/\u2192/g, "->"],
  [/\u2713/g, "*"],
  [/\u00d7/g, "x"],
  [/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)],
  [/[\u0600-\u06ff]/g, ""],
];

export function sanitizePdfText(text) {
  let out = String(text ?? "");
  REPLACEMENTS.forEach(([re, to]) => { out = out.replace(re, to); });
  return out;
}

export function parseRuns(text) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index), style: "normal" });
    const token = m[0];
    if (token.startsWith("**")) runs.push({ text: token.slice(2, -2), style: "bold" });
    else if (token.startsWith("`")) runs.push({ text: token.slice(1, -1), style: "code" });
    else runs.push({ text: token.slice(1, -1), style: "italic" });
    last = re.lastIndex;
  }
  if (last < text.length) runs.push({ text: text.slice(last), style: "normal" });
  return runs.filter((r) => r.text !== "");
}

function applyStyle(doc, style, fontSize) {
  doc.setFontSize(fontSize);
  if (style === "bold") doc.setFont(FONT, "bold");
  else if (style === "italic") doc.setFont(FONT, "italic");
  else doc.setFont(FONT, "normal");
}

// Splits runs into individual words so wrapping can happen mid-run.
function toWords(runs) {
  const words = [];
  runs.forEach((run) => {
    run.text.split(/(\s+)/).forEach((piece) => {
      if (piece === "") return;
      if (/^\s+$/.test(piece)) {
        if (words.length) words[words.length - 1].trailingSpace = true;
      } else {
        words.push({ text: piece, style: run.style, trailingSpace: false });
      }
    });
  });
  return words;
}

/**
 * Draws inline-markdown text with wrapping. Returns the y after the last line.
 * ctx: { doc, contentBottom, nextPageTop, onPageBreak }
 */
export function drawRichText(ctx, text, x, y, maxWidth, { fontSize = 10, lineHeight = 5, color = [51, 65, 85] } = {}) {
  const { doc } = ctx;
  const words = toWords(parseRuns(sanitizePdfText(text)));
  doc.setTextColor(...color);

  let cursorY = y;
  let line = [];
  let lineWidth = 0;

  const spaceWidth = () => {
    applyStyle(doc, "normal", fontSize);
    return doc.getTextWidth(" ");
  };

  const flush = () => {
    if (!line.length) return;
    if (cursorY + lineHeight > ctx.contentBottom) {
      doc.addPage();
      cursorY = ctx.nextPageTop;
      if (ctx.onPageBreak) ctx.onPageBreak();
    }
    let cursorX = x;
    line.forEach((w) => {
      applyStyle(doc, w.style, fontSize);
      doc.setTextColor(...(w.style === "code" ? [148, 30, 30] : color));
      doc.text(w.text, cursorX, cursorY);
      cursorX += doc.getTextWidth(w.text) + (w.trailingSpace ? spaceWidth() : 0);
    });
    cursorY += lineHeight;
    line = [];
    lineWidth = 0;
  };

  words.forEach((w) => {
    applyStyle(doc, w.style, fontSize);
    const wordWidth = doc.getTextWidth(w.text) + (w.trailingSpace ? spaceWidth() : 0);
    if (lineWidth + wordWidth > maxWidth && line.length) flush();
    line.push(w);
    lineWidth += wordWidth;
  });
  flush();

  doc.setTextColor(51, 65, 85);
  return cursorY;
}

// Plain text (markers stripped) — used for headings, TOC entries and table cells.
export function stripInline(text) {
  return sanitizePdfText(text).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}