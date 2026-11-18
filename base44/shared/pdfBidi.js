/**
 * Arabic-aware text for server-built PDFs (pdf-lib + fontkit). fontkit joins
 * Arabic letters and lays an Arabic run out right-to-left, but has no bidi:
 * a line mixing Arabic with numbers or Latin words is split here into runs of
 * one direction, put in the left-to-right order they are drawn, then drawn
 * run by run. Cairo (Google Fonts) carries both Arabic and Latin letters.
 */
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_OR_DIGIT = /[A-Za-z0-9\u00C0-\u024F]/;
const MIRROR = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' };
// Arabic-Indic digits are written as 0-9 so numbers keep their order.
const western = (s) => String(s ?? '').replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) & 15));

/** The line's words grouped by direction, in the left-to-right order they are drawn. */
export function visualRuns(text, rtl) {
  const words = western(text).split(/\s+/).filter(Boolean);
  const kind = words.map((w) => (ARABIC.test(w) ? 'R' : LATIN_OR_DIGIT.test(w) ? 'L' : 'N'));
  const base = rtl ? 'R' : 'L';
  const near = (i, step) => {
    for (let j = i + step; j >= 0 && j < kind.length; j += step) if (kind[j] !== 'N') return kind[j];
    return base;
  };
  // Punctuation between two words of one direction takes it; otherwise the line's.
  const dir = kind.map((k, i) => (k !== 'N' ? k : near(i, -1) === near(i, 1) ? near(i, -1) : base));
  const runs = [];
  words.forEach((w, i) => {
    const last = runs[runs.length - 1];
    if (last && last.dir === dir[i]) last.text += ` ${w}`;
    else runs.push({ dir: dir[i], text: w });
  });
  const out = runs.map(({ dir: d, text: t }) => {
    if (d !== 'R') return t;
    // fontkit reverses Arabic runs itself; brackets then need swapping to face the right way.
    return ARABIC.test(t) ? t.replace(/[()[\]{}<>]/g, (c) => MIRROR[c]) : t.split(' ').reverse().join(' ');
  });
  return rtl ? out.reverse() : out;
}

export function textWidth(font, size, runs) {
  const space = font.widthOfTextAtSize(' ', size);
  return runs.reduce((w, r, i) => w + font.widthOfTextAtSize(r, size) + (i ? space : 0), 0);
}

export function drawRuns(page, runs, { x, y, size, font, color }) {
  const space = font.widthOfTextAtSize(' ', size);
  let left = x;
  for (const run of runs) {
    page.drawText(run, { x: left, y, size, font, color });
    left += font.widthOfTextAtSize(run, size) + space;
  }
}

/** Splits text (keeping its own line breaks) into lines no wider than maxWidth. */
export function wrapText(font, size, text, maxWidth, rtl) {
  const lines = [];
  for (const para of western(text).split(/\r?\n/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && textWidth(font, size, visualRuns(next, rtl)) > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

/** One line, shortened with "..." when it would not fit. */
export function fitText(font, size, text, maxWidth, rtl) {
  let t = western(text).replace(/\s+/g, ' ').trim();
  if (textWidth(font, size, visualRuns(t, rtl)) <= maxWidth) return t;
  while (t.length > 1 && textWidth(font, size, visualRuns(`${t}...`, rtl)) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

const CAIRO_CSS = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700';
// Used when the Google Fonts stylesheet can't be read.
const CAIRO_FILES = [
  'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1Q.ttf',
  'https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hAc5W1Q.ttf',
];
let fonts = null;

/** Cairo regular and bold font files, kept for the life of the server instance. */
export async function loadArabicFonts() {
  if (fonts) return fonts;
  let urls = CAIRO_FILES;
  try {
    const css = await (await fetch(CAIRO_CSS, { signal: AbortSignal.timeout(8000) })).text();
    const found = [...css.matchAll(/url\((https:[^)]+\.ttf)\)/g)].map((m) => m[1]);
    if (found.length >= 2) urls = found;
  } catch { /* the known files below */ }
  const [regular, bold] = await Promise.all(urls.slice(0, 2).map(async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('The receipt font could not be downloaded. Try again in a moment.');
    return new Uint8Array(await res.arrayBuffer());
  }));
  fonts = { regular, bold };
  return fonts;
}