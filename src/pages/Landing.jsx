import React, { useEffect, useState } from "react";
import LandingPackages from "@/components/landing/LandingPackages";
import VeragatesFooter from "@/components/VeragatesFooter";
import ContactUsDialog from "@/components/landing/ContactUsDialog";
import { base44 } from "@/api/base44Client";
import { applyBrandTheme } from "@/lib/brandTheme";
import { useBrandInfo } from "@/components/landing/useBrandInfo";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingIntro from "@/components/landing/LandingIntro";
import LandingFeatureGrid from "@/components/landing/LandingFeatureGrid";
import LandingFlow from "@/components/landing/LandingFlow";
import LandingShowcase from "@/components/landing/LandingShowcase";
import LandingCta from "@/components/landing/LandingCta";
import { useIsHrEmployee } from "@/components/landing/useIsHrEmployee";
import { useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/components/LanguageProvider";
import ArabicAutoTranslator from "@/components/i18n/ArabicAutoTranslator";
import { useModuleAccess } from "@/hooks/useModuleAccess";

export default function Landing() {
  return (
    <LanguageProvider>
      <LandingContent />
    </LanguageProvider>
  );
}

// Public home page shown to visitors who are not signed in.
function LandingContent() {
  const { data: brand, isFetched } = useBrandInfo();
  // Admin › Modules › Website Packages closes the catalogue and its links.
  const showPackages = useModuleAccess().isModuleEnabled("website_menu");

  useEffect(() => {
    if (!isFetched) return;
    applyBrandTheme(brand);
    document.title = brand?.brand_name || "Rosemary";
  }, [brand, isFetched]);

  const isEmployee = useIsHrEmployee();
  const navigate = useNavigate();
  const signIn = isEmployee
    ? () => navigate("/EmployeeAttendance")
    : () => base44.auth.redirectToLogin(window.location.origin + "/");
  const [selected, setSelected] = useState([]);
  const [contactOpen, setContactOpen] = useState(false);

  const openContact = () => setContactOpen(true);
  const toggle = (pkg, extras = []) =>
    setSelected((prev) => (prev.some((p) => p.id === pkg.id) ? prev.filter((p) => p.id !== pkg.id) : [...prev, { ...pkg, chosen_extras: extras }]));
  const setExtras = (id, extras) =>
    setSelected((prev) => prev.map((p) => (p.id === id ? { ...p, chosen_extras: extras } : p)));

  return (
    <div className="min-h-screen bg-[hsl(var(--landing-ivory))] text-[hsl(var(--landing-navy))] scroll-smooth">
      <LandingHeader brand={brand} onSignIn={signIn} onContact={openContact} signInLabel={isEmployee ? "Access system" : "Sign in"} showPackages={showPackages} />
      <main>
        <LandingHero brand={brand} showPackages={showPackages} />
        {showPackages && <LandingPackages selected={selected} onToggle={toggle} onSetExtras={setExtras} onRequest={() => setContactOpen(true)} />}
        <LandingIntro />
        <LandingFeatureGrid />
        <LandingFlow />
        <LandingShowcase />
        <LandingCta brand={brand} />
      </main>
      <VeragatesFooter className="bg-[hsl(var(--landing-navy))] -mt-4" />
      <Toaster position="bottom-right" />
      <ArabicAutoTranslator />
      <ContactUsDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        selected={selected}
        onRemove={toggle}
        onSubmitted={() => setSelected([])}
      />
    </div>
  );
}