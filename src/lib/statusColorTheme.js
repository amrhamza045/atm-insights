import { hexToRgb, rgbToHsl } from "@/lib/colorUtils";

const LIGHTNESS = { 50: 97, 100: 93, 200: 85, 300: 76, 400: 66, 500: 56, 600: 48, 700: 40, 800: 32, 900: 25, 950: 18 };
const STATUS_FIELDS = { success: "success_color", warning: "warning_color", danger: "danger_color" };

export function clearStatusColorTokens() {
  const root = document.documentElement;
  Object.keys(STATUS_FIELDS).forEach((name) => {
    Object.keys(LIGHTNESS).forEach((shade) => root.style.removeProperty(`--${name}-${shade}`));
  });
}

export function applyStatusColorTheme(info) {
  clearStatusColorTokens();
  if (!info) return;

  Object.entries(STATUS_FIELDS).forEach(([name, field]) => {
    const rgb = hexToRgb(info[field]);
    if (!rgb) return;
    const { h, s } = rgbToHsl(rgb);
    const saturation = Math.max(s, 45);
    Object.entries(LIGHTNESS).forEach(([shade, lightness]) => {
      document.documentElement.style.setProperty(`--${name}-${shade}`, `${h} ${saturation}% ${lightness}%`);
    });
  });
}