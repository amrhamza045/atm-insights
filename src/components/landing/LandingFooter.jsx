import React from "react";
import { Phone, MapPin, MessageCircle, Globe, Facebook, Instagram } from "lucide-react";

export default function LandingFooter({ brand }) {
  const name = brand?.brand_name || "Rosemary";
  const contacts = [
    brand?.hotline && { icon: Phone, text: brand.hotline },
    brand?.whatsapp && { icon: MessageCircle, text: brand.whatsapp },
    brand?.address && { icon: MapPin, text: brand.address },
    brand?.website && { icon: Globe, text: brand.website, href: brand.website },
  ].filter(Boolean);
  const socials = [
    brand?.facebook && { icon: Facebook, href: brand.facebook, label: "Facebook" },
    brand?.instagram && { icon: Instagram, href: brand.instagram, label: "Instagram" },
  ].filter(Boolean);

  return (
    <footer className="bg-[hsl(var(--landing-cream))] border-t border-[hsl(var(--landing-navy)/0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center text-center gap-6">
        <div className="flex items-center gap-3">
          {(brand?.landing_logo_url || brand?.logo_url) && <img src={brand.landing_logo_url || brand.logo_url} alt={name} className="h-10 w-auto object-contain rounded-md" />}
          <p data-no-translate className="font-heading text-2xl font-semibold text-[hsl(var(--landing-navy))]">{name}</p>
        </div>
        <p className="text-sm text-[hsl(var(--landing-navy)/0.6)]">Catering for weddings, corporate events & private celebrations</p>
        <span className="block h-px w-12 bg-[hsl(var(--landing-gold))]" aria-hidden="true" />

        {contacts.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-[hsl(var(--landing-navy)/0.7)]">
            {contacts.map(({ icon: Icon, text, href }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[hsl(var(--landing-gold))]" />
                {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(var(--landing-navy))]">{text}</a> : text}
              </li>
            ))}
          </ul>
        )}

        {socials.length > 0 && (
          <div className="flex items-center gap-3">
            {socials.map(({ icon: Icon, href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="h-10 w-10 rounded-full border border-[hsl(var(--landing-navy)/0.2)] flex items-center justify-center text-[hsl(var(--landing-navy)/0.7)] hover:text-[hsl(var(--landing-gold))] hover:border-[hsl(var(--landing-gold))] transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        )}
        <p className="text-xs text-[hsl(var(--landing-navy)/0.45)]">© {new Date().getFullYear()} {name}</p>
      </div>
    </footer>
  );
}