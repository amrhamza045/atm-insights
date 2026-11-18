import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import LogoManager from "./LogoManager";
import BrandNameManager from "./BrandNameManager";
import ColorPaletteManager from "./ColorPaletteManager";
import StatusColorsManager from "@/components/branding/StatusColorsManager";
import { collisionAdvisory } from "@/components/branding/colorCollision";

export default function BrandingSettings() {
  const queryClient = useQueryClient();

  const { data: restaurantInfo, isLoading } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      const list = await base44.entities.RestaurantInfo.list();
      return list[0] || null;
    },
  });

  const [logoUrl, setLogoUrl] = React.useState("");
  const [landingLogoUrl, setLandingLogoUrl] = React.useState("");
  const [brandName, setBrandName] = React.useState("");
  const [themeEnabled, setThemeEnabled] = React.useState(false);
  const [primaryColor, setPrimaryColor] = React.useState("#0f172a");
  const [secondaryColor, setSecondaryColor] = React.useState("#f59e0b");
  const [accentColor, setAccentColor] = React.useState("#f97316");
  const [statusColors, setStatusColors] = React.useState({ success: "", warning: "", danger: "" });
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    if (restaurantInfo && !initialized) {
      setLogoUrl(restaurantInfo.logo_url || "");
      setLandingLogoUrl(restaurantInfo.landing_logo_url || "");
      setBrandName(restaurantInfo.brand_name || "");
      setThemeEnabled(!!restaurantInfo.theme_enabled);
      setPrimaryColor(restaurantInfo.primary_color ?? "#0f172a");
      setSecondaryColor(restaurantInfo.secondary_color ?? "#f59e0b");
      setAccentColor(restaurantInfo.accent_color ?? "#f97316");
      setStatusColors({
        success: restaurantInfo.success_color ?? "",
        warning: restaurantInfo.warning_color ?? "",
        danger: restaurantInfo.danger_color ?? "",
      });
      setInitialized(true);
    }
  }, [restaurantInfo, initialized]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (restaurantInfo?.id) {
        return base44.entities.RestaurantInfo.update(restaurantInfo.id, data);
      }
      return base44.entities.RestaurantInfo.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurantInfo"] });
      toast.success("Branding saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save branding", { description: error.message });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      logo_url: logoUrl,
      landing_logo_url: landingLogoUrl,
      brand_name: brandName,
      theme_enabled: themeEnabled,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      success_color: statusColors.success || null,
      warning_color: statusColors.warning || null,
      danger_color: statusColors.danger || null,
    });
  };

  const brandColors = [
    { label: "Primary", value: primaryColor },
    { label: "Secondary", value: secondaryColor },
    { label: "Accent", value: accentColor },
  ];
  const statusCandidates = [
    { label: "Success", value: statusColors.success },
    { label: "Warning", value: statusColors.warning },
    { label: "Danger", value: statusColors.danger },
  ];
  const statusAdvisories = Object.fromEntries(
    Object.entries(statusColors).map(([key, value]) => [key, collisionAdvisory(value, brandColors)])
  );
  const brandAdvisories = Object.fromEntries(
    brandColors.map(({ label, value }) => [label.toLowerCase(), collisionAdvisory(value, statusCandidates)])
  );
  const changeStatusColor = (key, value) => setStatusColors((current) => ({ ...current, [key]: value }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Branding</h2>
        <p className="text-sm text-slate-500">
          Manage your logo, business name, and color palette from one place.
        </p>
      </div>

      <LogoManager logoUrl={logoUrl} onLogoChange={setLogoUrl} />
      <LogoManager logoUrl={landingLogoUrl} onLogoChange={setLandingLogoUrl}
        title="Landing page logo (blue background)" previewClass="bg-navy"
        hint="Shown on the public landing page header and footer. Uses the site logo if none is set."
        fallback={logoUrl || undefined} />
      <BrandNameManager brandName={brandName} onChange={setBrandName} />
      <ColorPaletteManager
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        accentColor={accentColor}
        themeEnabled={themeEnabled}
        onPrimaryChange={setPrimaryColor}
        onSecondaryChange={setSecondaryColor}
        onAccentChange={setAccentColor}
        onThemeToggle={setThemeEnabled}
        advisories={brandAdvisories}
      />
      <StatusColorsManager
        colors={statusColors}
        onChange={changeStatusColor}
        advisories={statusAdvisories}
      />

      <div className="sticky bottom-4 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="gap-2 shadow-lg"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saveMutation.isPending ? "Saving..." : "Save Branding"}
        </Button>
      </div>
    </div>
  );
}