import React from "react";
import { Mail, Phone, MessageCircle, Facebook, Instagram, Music2, MapPin } from "lucide-react";

export default function LandingCta({ brand }) {
  const wa = (brand?.whatsapp || "").replace(/\D/g, "");
  const contacts = [
    brand?.email && { icon: Mail, label: brand.email, href: `mailto:${brand.email}` },
    brand?.phone && { icon: Phone, label: brand.phone, href: `tel:${brand.phone}` },
    brand?.landline && { icon: Phone, label: brand.landline, href: `tel:${brand.landline}` },
    brand?.hotline && { icon: Phone, label: brand.hotline, href: `tel:${brand.hotline}` },
    wa && { icon: MessageCircle, label: brand.whatsapp, href: `https://wa.me/${wa}` },
  ].filter(Boolean);
  const socials = [
    brand?.facebook && { icon: Facebook, label: "Facebook", href: brand.facebook },
    brand?.instagram && { icon: Instagram, label: "Instagram", href: brand.instagram },
    brand?.tiktok && { icon: Music2, label: "TikTok", href: brand.tiktok },
    brand?.location && { icon: MapPin, label: "Location", href: brand.location },
  ].filter(Boolean);
  const linkProps = (href) => href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {};

  return (
    <section className="bg-[hsl(var(--landing-navy))] pt-8 md:pt-10 pb-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-[hsl(var(--landing-ivory))]">
        <span className="block mx-auto h-px w-16 bg-[hsl(var(--landing-gold))]" aria-hidden="true" />
        <h2 className="font-heading mt-5 text-3xl md:text-4xl lg:whitespace-nowrap font-medium tracking-tight leading-tight">
          Planning an event? Let {brand?.brand_name || "Rosemary"} take care of the food.
        </h2>
        {contacts.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {contacts.map(({ icon: Icon, label, href }) => (
              <a key={href} href={href} {...linkProps(href)} className="flex items-center gap-2 font-medium hover:text-[hsl(var(--landing-gold))] transition-colors">
                <Icon className="w-4 h-4" />
                <span dir="ltr">{label}</span>
              </a>
            ))}
          </div>
        )}
        {socials.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-5">
            {socials.map(({ icon: Icon, label, href }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="hover:text-[hsl(var(--landing-gold))] transition-colors">
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}