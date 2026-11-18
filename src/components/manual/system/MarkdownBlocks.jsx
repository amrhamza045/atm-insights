import React from "react";
import renderInline from "./inlineMarkdown";
import parseMarkdownBlocks from "./parseMarkdownBlocks";
import slugify from "./slugify";

const HEADING_CLASS = {
  1: "text-3xl font-bold text-slate-900 mt-2 mb-4 pb-3 border-b border-slate-200",
  2: "text-xl font-bold text-slate-900 mt-8 mb-3",
  3: "text-base font-semibold text-slate-900 mt-6 mb-2",
  4: "text-sm font-semibold text-slate-800 mt-4 mb-1",
};

export default function MarkdownBlocks({ markdown }) {
  const blocks = parseMarkdownBlocks(markdown);
  return (
    <div className="text-[15px] leading-relaxed text-slate-700">
      {blocks.map((b, i) => {
        if (b.type === "heading") return React.createElement(`h${b.level}`, { key: i, id: slugify(b.text), className: `${HEADING_CLASS[b.level]} scroll-mt-32` }, renderInline(b.text));
        if (b.type === "paragraph") return <p key={i} className="my-3">{renderInline(b.text)}</p>;
        if (b.type === "quote") return <blockquote key={i} className="my-4 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 rounded-r-lg text-amber-900">{renderInline(b.text)}</blockquote>;
        if (b.type === "code") return <pre key={i} className="my-4 bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre">{b.text}</pre>;
        if (b.type === "bullets" || b.type === "numbered") {
          const Tag = b.type === "bullets" ? "ul" : "ol";
          const cls = b.type === "bullets" ? "list-disc" : "list-decimal";
          return (
            <Tag key={i} className={`${cls} pl-6 my-3 space-y-1.5`}>
              {b.items.map((it, j) => (
                <li key={j}>
                  {renderInline(it.text)}
                  {it.children.length > 0 && (
                    <ul className="list-[circle] pl-5 mt-1 space-y-1">{it.children.map((c, k) => <li key={k}>{renderInline(c)}</li>)}</ul>
                  )}
                </li>
              ))}
            </Tag>
          );
        }
        if (b.type === "table") {
          return (
            <div key={i} className="my-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr>{b.head.map((h, j) => <th key={j} className="text-left font-semibold text-slate-800 px-3 py-2 border-b border-slate-200">{renderInline(h)}</th>)}</tr></thead>
                <tbody>{b.body.map((row, r) => <tr key={r} className="odd:bg-white even:bg-slate-50/60 align-top">{row.map((c, j) => <td key={j} className="px-3 py-2 border-b border-slate-100">{renderInline(c)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}