import React from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette } from "lucide-react";
import { isValidHex } from "@/lib/colorUtils";
import ColorField from "@/components/branding/ColorField";

export default function ColorPaletteManager({
  primaryColor,
  secondaryColor,
  accentColor,
  themeEnabled,
  onPrimaryChange,
  onSecondaryChange,
  onAccentChange,
  onThemeToggle,
  advisories,
}) {
  const primaryValid = isValidHex(primaryColor);
  const secondaryValid = isValidHex(secondaryColor);
  const accentValid = isValidHex(accentColor);

  return (
    <Card className="p-6 border-0 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-500" />
            Color Palette
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Pick your brand colors. Enable the switch to apply them across the
            whole website.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">
              Apply brand theme across the website
            </p>
            <p className="text-xs text-slate-500">
              Overrides default accent colors everywhere
            </p>
          </div>
          <Switch checked={themeEnabled} onCheckedChange={onThemeToggle} />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-5">
        <ColorField label="Primary" value={primaryColor} onChange={onPrimaryChange} advisory={advisories.primary} />
        <ColorField label="Secondary" value={secondaryColor} onChange={onSecondaryChange} advisory={advisories.secondary} />
        <ColorField label="Accent" value={accentColor} onChange={onAccentChange} advisory={advisories.accent} />
      </div>

      {/* Live preview */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-medium text-slate-500 mb-3">Live preview</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            style={
              primaryValid
                ? { backgroundColor: primaryColor, borderColor: primaryColor }
                : undefined
            }
          >
            Primary button
          </Button>
          <Button
            variant="outline"
            style={
              primaryValid
                ? { color: primaryColor, borderColor: primaryColor }
                : undefined
            }
          >
            Outline
          </Button>
          <Badge
            style={
              accentValid ? { backgroundColor: accentColor, color: "#fff" } : undefined
            }
          >
            Accent badge
          </Badge>
          <Badge
            style={
              secondaryValid
                ? { backgroundColor: secondaryColor, color: "#fff" }
                : undefined
            }
          >
            Secondary badge
          </Badge>
          <span
            style={primaryValid ? { color: primaryColor } : undefined}
            className="text-sm font-medium underline cursor-pointer"
          >
            Sample link
          </span>
        </div>
      </div>
    </Card>
  );
}