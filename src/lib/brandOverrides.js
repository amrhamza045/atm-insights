// The app's accent color is hardcoded across hundreds of files as Tailwind
// `amber-*` / `orange-*` utilities (bg-amber-500, from-orange-500, text-amber-600...).
// Rather than rewriting every file, we generate a stylesheet that remaps those
// two color families onto the saved brand color, so enabling the brand theme
// recolors the entire app.
import { hexToRgb, rgbToHsl } from "./colorUtils";

// Lightness stops that mirror Tailwind's shade scale.
const SHADE_LIGHTNESS = {
  50: 97,
  100: 93,
  200: 85,
  300: 76,
  400: 66,
  500: 56,
  600: 48,
  700: 40,
  800: 32,
  900: 25,
  950: 18,
};

const FAMILIES = ["amber", "orange", "yellow"];
const SHADES = Object.keys(SHADE_LIGHTNESS);

// Utilities that appear in the codebase, mapped to the CSS property they set.
const PROPERTY_UTILITIES = [
  ["bg", "background-color"],
  ["text", "color"],
  ["border", "border-color"],
  ["ring", "--tw-ring-color"],
  ["fill", "fill"],
  ["stroke", "stroke"],
  ["decoration", "text-decoration-color"],
  ["shadow", "--tw-shadow-color"],
  ["divide", "border-color"],
];

function esc(cls) {
  return cls.replace(/:/g, "\\:");
}

export function buildBrandOverrideCss(primaryHex) {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) return "";
  const { h, s } = rgbToHsl(rgb);
  const sat = Math.max(s, 45);

  const color = (shade) => `hsl(${h} ${sat}% ${SHADE_LIGHTNESS[shade]}%)`;

  const rules = [];

  FAMILIES.forEach((family) => {
    SHADES.forEach((shade) => {
      const token = `${family}-${shade}`;
      const value = color(shade);

      PROPERTY_UTILITIES.forEach(([prefix, prop]) => {
        const base = `${prefix}-${token}`;
        // plain + pseudo-class variants
        rules.push(`.${esc(base)}{${prop}:${value} !important}`);
        rules.push(`.${esc(`hover:${base}`)}:hover{${prop}:${value} !important}`);
        rules.push(`.${esc(`focus:${base}`)}:focus{${prop}:${value} !important}`);
        rules.push(`.${esc(`active:${base}`)}:active{${prop}:${value} !important}`);
        rules.push(
          `.group:hover .${esc(`group-hover:${base}`)}{${prop}:${value} !important}`
        );
        rules.push(
          `.${esc(`data-[state=active]:${base}`)}[data-state="active"]{${prop}:${value} !important}`
        );
      });

      // Gradients
      rules.push(
        `.${esc(`from-${token}`)}{--tw-gradient-from:${value} var(--tw-gradient-from-position) !important;--tw-gradient-stops:var(--tw-gradient-from), var(--tw-gradient-to) !important}`
      );
      rules.push(
        `.${esc(`to-${token}`)}{--tw-gradient-to:${value} var(--tw-gradient-to-position) !important}`
      );
      rules.push(
        `.${esc(`via-${token}`)}{--tw-gradient-stops:var(--tw-gradient-from), ${value} var(--tw-gradient-via-position), var(--tw-gradient-to) !important}`
      );
      rules.push(
        `.${esc(`hover:from-${token}`)}:hover{--tw-gradient-from:${value} var(--tw-gradient-from-position) !important}`
      );
      rules.push(
        `.${esc(`hover:to-${token}`)}:hover{--tw-gradient-to:${value} var(--tw-gradient-to-position) !important}`
      );
    });
  });

  return rules.join("\n");
}