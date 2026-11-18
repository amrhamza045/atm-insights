import parseMarkdownBlocks from "./parseMarkdownBlocks";
import { drawRichText, stripInline, sanitizePdfText } from "./manualPdfText";

// Mirrors MarkdownBlocks.jsx, but drawing into a jsPDF document.
const HEADING = {
  1: { size: 20, gapBefore: 0, gapAfter: 6, rule: true },
  2: { size: 14, gapBefore: 7, gapAfter: 3.5, rule: false },
  3: { size: 11.5, gapBefore: 5, gapAfter: 2.5, rule: false },
  4: { size: 10.5, gapBefore: 4, gapAfter: 2, rule: false },
};

const TEXT = [51, 65, 85];
const DARK = [15, 23, 42];

function ensureSpace(ctx, y, needed) {
  if (y + needed > ctx.contentBottom) {
    ctx.doc.addPage();
    return ctx.nextPageTop;
  }
  return y;
}

function drawHeading(ctx, block, y) {
  const { doc, margin, pageWidth, brandRgb } = ctx;
  const meta = HEADING[block.level] || HEADING[4];
  y += meta.gapBefore;
  y = ensureSpace(ctx, y, meta.size * 0.6 + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(meta.size);
  doc.setTextColor(...(block.level <= 2 ? DARK : TEXT));
  const lines = doc.splitTextToSize(stripInline(block.text), ctx.maxWidth);
  lines.forEach((line) => {
    doc.text(line, ctx.contentX, y);
    y += meta.size * 0.42;
  });

  if (meta.rule) {
    y += 2;
    doc.setDrawColor(...brandRgb);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
  } else if (block.level === 2) {
    y += 1.5;
    doc.setDrawColor(...brandRgb);
    doc.setLineWidth(0.3);
    doc.line(ctx.contentX, y, ctx.contentX + 24, y);
  }
  return y + meta.gapAfter;
}

function drawList(ctx, block, y) {
  const { doc } = ctx;
  const indent = 6;
  block.items.forEach((item, idx) => {
    const marker = block.type === "numbered" ? `${idx + 1}.` : "•";
    y = ensureSpace(ctx, y, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...ctx.brandRgb);
    doc.text(marker, ctx.contentX, y);
    doc.setTextColor(...TEXT);

    y = drawRichText(ctx, item.text, ctx.contentX + indent, y, ctx.maxWidth - indent, { fontSize: 10, lineHeight: 4.8 });

    item.children.forEach((child) => {
      y = ensureSpace(ctx, y, 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(120, 130, 145);
      doc.text("–", ctx.contentX + indent + 3, y);
      y = drawRichText(ctx, child, ctx.contentX + indent + 8, y, ctx.maxWidth - indent - 8, { fontSize: 9.5, lineHeight: 4.4 });
    });
    y += 1.2;
  });
  return y + 2;
}

function drawQuote(ctx, block, y) {
  const { doc, brandRgb } = ctx;
  y = ensureSpace(ctx, y, 14);
  const startY = y - 3.5;
  const innerX = ctx.contentX + 5;
  const endY = drawRichText(ctx, block.text, innerX, y, ctx.maxWidth - 7, { fontSize: 10, lineHeight: 4.8, color: [124, 72, 12] });
  doc.setDrawColor(...brandRgb);
  doc.setLineWidth(1.4);
  doc.line(ctx.contentX + 1, startY, ctx.contentX + 1, endY - 3.5);
  return endY + 3;
}

function drawTable(ctx, block, y) {
  const { doc } = ctx;
  const cols = block.head.length;
  const colWidth = ctx.maxWidth / cols;
  const pad = 1.8;

  const rowHeights = (cells, fontSize) =>
    Math.max(...cells.map((c) => {
      doc.setFontSize(fontSize);
      return doc.splitTextToSize(stripInline(c), colWidth - pad * 2).length;
    })) * 4.2 + 3;

  const drawRow = (cells, { bold, fill }) => {
    const h = rowHeights(cells, 9);
    y = ensureSpace(ctx, y, h + 2);
    if (fill) {
      doc.setFillColor(...fill);
      doc.rect(ctx.contentX, y - 4, ctx.maxWidth, h, "F");
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(...(bold ? DARK : TEXT));
    cells.forEach((cell, i) => {
      const lines = doc.splitTextToSize(stripInline(cell), colWidth - pad * 2);
      lines.forEach((line, li) => doc.text(line, ctx.contentX + i * colWidth + pad, y + li * 4.2));
    });
    y += h;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(ctx.contentX, y - 3.4, ctx.contentX + ctx.maxWidth, y - 3.4);
  };

  y = ensureSpace(ctx, y, 16);
  drawRow(block.head, { bold: true, fill: [241, 245, 249] });
  block.body.forEach((row) => drawRow(row, { bold: false }));
  return y + 3;
}

function drawCode(ctx, block, y) {
  const { doc } = ctx;
  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);
  const lines = sanitizePdfText(block.text).split("\n").flatMap((l) => doc.splitTextToSize(l, ctx.maxWidth - 6));
  const height = lines.length * 4 + 5;
  y = ensureSpace(ctx, y, height);
  doc.setFillColor(30, 41, 59);
  doc.rect(ctx.contentX, y - 4, ctx.maxWidth, height, "F");
  doc.setTextColor(226, 232, 240);
  lines.forEach((line, i) => doc.text(line, ctx.contentX + 3, y + i * 4));
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  return y + height + 2;
}

// Renders one chapter's markdown starting at y; returns the y after the last block.
export function renderChapterMarkdown(ctx, markdown, startY) {
  let y = startY;
  parseMarkdownBlocks(markdown).forEach((block) => {
    if (block.type === "heading") y = drawHeading(ctx, block, y);
    else if (block.type === "paragraph") {
      y = ensureSpace(ctx, y, 8);
      y = drawRichText(ctx, block.text, ctx.contentX, y, ctx.maxWidth, { fontSize: 10, lineHeight: 4.9 });
      y += 2.5;
    }
    else if (block.type === "bullets" || block.type === "numbered") y = drawList(ctx, block, y);
    else if (block.type === "quote") y = drawQuote(ctx, block, y);
    else if (block.type === "table") y = drawTable(ctx, block, y);
    else if (block.type === "code") y = drawCode(ctx, block, y);
  });
  return y;
}