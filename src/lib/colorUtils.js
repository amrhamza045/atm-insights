// Color helpers for the Branding module.
// All functions are pure and safe against bad input.

export function isValidHex(hex) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test((hex || "").trim());
}

export function normalizeHex(hex) {
  if (!hex) return "";
  let h = hex.trim();
  if (!h.startsWith("#")) h = "#" + h;
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    h = "#" + h
      .slice(1)
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return h.toUpperCase();
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex);
  if (!/^#[0-9A-Fa-f]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

export function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Returns "H S% L%" — the channel format the app's CSS tokens expect
// (tokens are consumed as hsl(var(--token))).
export function hexToHslChannels(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb);
  return `${h} ${s}% ${l}%`;
}

// Returns a readable foreground (near-black or near-white) for a given hex bg.
export function getContrastForeground(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "0 0% 100%";
  const { r, g, b } = rgb;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? "0 0% 9%" : "0 0% 98%";
}