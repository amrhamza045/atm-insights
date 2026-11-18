import React from "react";
import { motion } from "framer-motion";
import { HERO_VIDEO_URL } from "./landingContent";

const rise = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } };

export default function LandingHero({ brand, showPackages = true }) {
  const name = brand?.brand_name || "Rosemary";

  return (
    <section id="top" className="relative w-full min-h-[85vh] flex items-center overflow-hidden bg-[hsl(var(--landing-navy))]">
      <video
        src={HERO_VIDEO_URL}
        autoPlay muted loop playsInline
        aria-label="Chefs preparing an elegant catering buffet"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--landing-navy)/0.88)] via-[hsl(var(--landing-navy)/0.6)] to-[hsl(var(--landing-navy)/0.2)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[hsl(var(--landing-navy)/0.7)] to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 w-full">
        <motion.div variants={rise} initial="hidden" animate="show" transition={{ duration: 0.7 }} className="max-w-2xl text-[hsl(var(--landing-ivory))]">
          <p className="text-xs md:text-sm font-semibold tracking-[0.3em] uppercase text-[hsl(var(--landing-gold))]">Catering for every occasion</p>
          <span className="block mt-4 h-px w-16 bg-[hsl(var(--landing-gold))]" aria-hidden="true" />
          <h1 className="font-heading mt-6 text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.05] tracking-tight">
            Unforgettable food. Effortless events.
          </h1>
          <p className="mt-7 max-w-xl text-base md:text-lg text-[hsl(var(--landing-ivory)/0.8)] leading-relaxed">
            {name} caters weddings, corporate gatherings and private celebrations — fresh menus, a professional service team and full setup at your venue.
          </p>
          {showPackages && (
          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <a
              href="#packages"
              className="h-12 px-8 rounded-sm bg-[hsl(var(--landing-gold))] text-[hsl(var(--landing-navy))] font-semibold flex items-center hover:opacity-90 transition-opacity"
            >
              Explore our packages
            </a>
          </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}