import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import LogoManager from "@/components/branding/LogoManager";
import { MODULES_QUERY_KEY, fetchModuleSettings } from "@/hooks/useModuleAccess";

export default function SupportLandingCard() {
  const qc = useQueryClient();

  const { data: info, isLoading: loadingInfo } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => (await base44.entities.RestaurantInfo.list())[0] || null,
  });

  const { data: modSettings, isLoading: loadingMod } = useQuery({
    queryKey: MODULES_QUERY_KEY,
    queryFn: fetchModuleSettings,
  });

  const [brandName, setBrandName] = useState("");
  const [landingLogoUrl, setLandingLogoUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [showPackages, setShowPackages] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loadingInfo && !loadingMod && !ready) {
      setBrandName(info?.brand_name || "");
      setLandingLogoUrl(info?.landing_logo_url || "");
      setPhone(info?.phone || "");
      setWhatsapp(info?.whatsapp || "");
      setEmail(info?.email || "");
      const disabled = modSettings?.disabled_modules || [];
      setShowPackages(!disabled.includes("website_menu"));
      setReady(true);
    }
  }, [info, modSettings, loadingInfo, loadingMod, ready]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const infoPayload = {
        brand_name: brandName,
        landing_logo_url: landingLogoUrl,
        phone,
        whatsapp,
        email,
      };
      if (info?.id) {
        await base44.entities.RestaurantInfo.update(info.id, infoPayload);
      } else {
        await base44.entities.RestaurantInfo.create(infoPayload);
      }

      const currentDisabled = new Set(modSettings?.disabled_modules || []);
      if (showPackages) currentDisabled.delete("website_menu");
      else currentDisabled.add("website_menu");
      const nextDisabled = [...currentDisabled];

      if (modSettings?.id) {
        await base44.entities.SystemSettings.update(modSettings.id, { disabled_modules: nextDisabled });
      } else {
        await base44.entities.SystemSettings.create({ setting_key: "default", disabled_modules: nextDisabled });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["restaurantInfo"] });
      qc.invalidateQueries({ queryKey: MODULES_QUERY_KEY });
      toast.success("Landing page settings saved");
    },
    onError: (e) => toast.error(e.message || "Could not save landing page settings"),
  });

  if (loadingInfo || loadingMod) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm">Show catering packages catalogue on landing page</p>
            <p className="text-xs text-muted-foreground">
              Controls the public "Explore our packages" CTA, packages carousel, and quote request button on the home page.
            </p>
          </div>
          <Switch checked={showPackages} onCheckedChange={setShowPackages} />
        </CardContent>
      </Card>

      <LogoManager
        logoUrl={landingLogoUrl}
        onLogoChange={setLandingLogoUrl}
        title="Landing page logo (navy header)"
        previewClass="bg-[hsl(var(--landing-navy))]"
        hint="Displayed in the public landing page header. Falls back to the main site logo when empty."
        fallback={info?.logo_url || undefined}
      />

      <Card>
        <CardContent className="p-4 grid sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Public Brand Headline Name</Label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Rosemary" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Public Contact Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+20..." dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Public WhatsApp</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+20..." dir="ltr" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Public Contact Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@rosemary.com" dir="ltr" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Landing Page Settings
        </Button>
      </div>
    </div>
  );
}