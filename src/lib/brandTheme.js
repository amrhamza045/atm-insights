// Applies (or clears) the saved brand palette as CSS custom properties on :root.
// When theme_enabled is true, the brand colors override the app's default
// semantic tokens (--primary, --accent, --secondary, --ring, sidebar tokens)
// so every page that uses bg-primary / bg-accent / ring-ring etc. picks them up
// automatically. When disabled, inline overrides are removed and the app falls
// back to the defaults declared in src/index.css.
import { hexToHslChannels, getContrastForeground } from "./colorUtils";
import { buildBrandOverrideCss } from "./brandOverrides";
import { applyStatusColorTheme } from "@/lib/statusColorTheme";
import { appParams } from "./app-params";

const OVERRIDE_STYLE_ID = "brand-color-overrides";
const STORAGE_KEY = `restaurant-theme:${appParams.appId || "default"}`;
const NEUTRAL_THEME = {
  theme_enabled: true,
  primary_color: "#475569",
  secondary_color: "#E2E8F0",
  accent_color: "#64748B",
};

// Recolors the app's hardcoded amber/orange utility classes to the brand color.
function applyUtilityOverrides(primaryHex) {
  let styleEl = document.getElementById(OVERRIDE_STYLE_ID);
  const css = primaryHex ? buildBrandOverrideCss(primaryHex) : "";
  if (!css) {
    if (styleEl) styleEl.remove();
    return;
  }
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = OVERRIDE_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}

const BRAND_TOKENS = [
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--secondary",
  "--secondary-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
];

function clearBrandTokens() {
  const root = document.documentElement;
  BRAND_TOKENS.forEach((token) => root.style.removeProperty(token));
}

export function applyBrandTheme(info, persist = true) {
  const theme = info?.theme_enabled ? info : NEUTRAL_THEME;

  if (persist && info) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        theme_enabled: info.theme_enabled,
        primary_color: info.primary_color,
        secondary_color: info.secondary_color,
        accent_color: info.accent_color,
        success_color: info.success_color ?? null,
        warning_color: info.warning_color ?? null,
        danger_color: info.danger_color ?? null,
      }));
    } catch {
      // The neutral boot theme still prevents tenant branding leakage.
    }
  }

  clearBrandTokens();
  applyUtilityOverrides(theme.primary_color);
  applyStatusColorTheme(info?.theme_enabled ? info : null);

  const primary = hexToHslChannels(theme.primary_color);
  const secondary = hexToHslChannels(theme.secondary_color);
  const accent = hexToHslChannels(theme.accent_color);
  if (!primary && !secondary && !accent) return;

  const root = document.documentElement;

  if (primary) {
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-foreground", getContrastForeground(theme.primary_color));
    root.style.setProperty("--ring", primary);
    root.style.setProperty("--sidebar-primary", primary);
    root.style.setProperty("--sidebar-primary-foreground", getContrastForeground(theme.primary_color));
  }
  if (secondary) {
    root.style.setProperty("--secondary", secondary);
    root.style.setProperty("--secondary-foreground", getContrastForeground(theme.secondary_color));
  }
  if (accent) {
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-foreground", getContrastForeground(theme.accent_color));
    root.style.setProperty("--sidebar-accent", accent);
    root.style.setProperty("--sidebar-accent-foreground", getContrastForeground(theme.accent_color));
  }
}

export function applyBootTheme() {
  let cachedTheme = null;
  try {
    cachedTheme = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    cachedTheme = null;
  }
  applyBrandTheme(cachedTheme || NEUTRAL_THEME, false);
}