// Groups manual sections (already sorted by order) into Domain › Chapter.
// Older sections without a domain fall back to their category.
export function buildManualTree(sections = []) {
  const domains = [];
  for (const s of sections) {
    const domainName = s.domain || s.category || "Other";
    let domain = domains.find((d) => d.name === domainName);
    if (!domain) {
      domain = { name: domainName, number: (s.chapter_code || "").split(".")[0], chapters: [] };
      domains.push(domain);
    }
    const chapterName = s.chapter || domainName;
    let chapter = domain.chapters.find((c) => c.name === chapterName);
    if (!chapter) {
      chapter = { name: chapterName, code: s.chapter_code || "", modules: [] };
      domain.chapters.push(chapter);
    }
    chapter.modules.push(s);
  }
  return domains;
}