import { hexToRgb, isValidHex, rgbToHsl } from "@/lib/colorUtils";

function hueDistance(a, b) {
  const distance = Math.abs(a - b);
  return Math.min(distance, 360 - distance);
}

export function findColorCollision(color, candidates) {
  if (!isValidHex(color)) return null;
  const source = rgbToHsl(hexToRgb(color));
  if (source.s < 20) return null;

  return candidates.find(({ value }) => {
    if (!isValidHex(value)) return false;
    const target = rgbToHsl(hexToRgb(value));
    return target.s >= 20
      && hueDistance(source.h, target.h) <= 25
      && Math.abs(source.s - target.s) <= 25
      && Math.abs(source.l - target.l) <= 20;
  })?.label || null;
}

export function collisionAdvisory(color, candidates) {
  const label = findColorCollision(color, candidates);
  return label ? `Close to ${label}; users may confuse brand and status meaning.` : "";
}