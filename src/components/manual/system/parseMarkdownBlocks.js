// Parses the markdown subset used by the manual chapters into a flat block list:
// heading, paragraph, bullets, numbered, table, quote, code.
export default function parseMarkdownBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let i = 0;

  const collect = (test) => {
    const out = [];
    while (i < lines.length && test(lines[i])) out.push(lines[i++]);
    return out;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith("```")) {
      i++;
      const code = collect((l) => !l.startsWith("```"));
      i++;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) { blocks.push({ type: "heading", level: heading[1].length, text: heading[2] }); i++; continue; }

    if (line.startsWith("|")) {
      const rows = collect((l) => l.startsWith("|")).map((r) => r.slice(1, -1).split("|").map((c) => c.trim()));
      const [head, , ...body] = rows; // second row is the separator
      blocks.push({ type: "table", head, body });
      continue;
    }

    if (line.startsWith(">")) {
      const quote = collect((l) => l.startsWith(">")).map((l) => l.replace(/^>\s?/, ""));
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = collect((l) => /^\s*[-*]\s+/.test(l) || /^\s{2,}\S/.test(l));
      blocks.push({ type: "bullets", items: mergeContinuations(items, /^\s*[-*]\s+/) });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = collect((l) => /^\s*\d+\.\s+/.test(l) || /^\s{2,}\S/.test(l));
      blocks.push({ type: "numbered", items: mergeContinuations(items, /^\s*\d+\.\s+/) });
      continue;
    }

    const para = collect((l) => l.trim() && !/^(#|\||>|```|\s*[-*]\s|\s*\d+\.\s)/.test(l));
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }
  return blocks;
}

// Joins indented continuation lines onto the preceding list item; nested items become sub-items.
function mergeContinuations(lines, markerRe) {
  const items = [];
  lines.forEach((l) => {
    const isNested = /^\s{2,}[-*]\s+/.test(l);
    if (markerRe.test(l) && !isNested) {
      items.push({ text: l.replace(markerRe, ""), children: [] });
    } else if (isNested && items.length) {
      items[items.length - 1].children.push(l.replace(/^\s*[-*]\s+/, ""));
    } else if (items.length) {
      items[items.length - 1].text += " " + l.trim();
    }
  });
  return items;
}