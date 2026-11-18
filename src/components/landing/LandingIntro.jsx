import React from "react";
import { MODULE_CHIPS } from "./landingContent";
import LandingSectionTitle from "./LandingSectionTitle";

function Chip({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3 h-14 px-6 rounded-sm bg-[hsl(var(--landing-ivory))] border border-[hsl(var(--landing-navy)/0.15)] whitespace-nowrap">
      <Icon className="w-4 h-4 text-[hsl(var(--landing-gold))]" />
      <span className="text-sm font-medium text-[hsl(var(--landing-navy))]">{label}</span>
    </div>
  );
}

export default function LandingIntro() {
  const loop = [...MODULE_CHIPS, ...MODULE_CHIPS];
  return (
    <section className="bg-[hsl(var(--landing-cream))] py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <LandingSectionTitle
          title="Whatever the occasion, we cater it"
          subtitle="From an intimate dinner for ten to a celebration for a thousand guests — one team, one kitchen, one standard of quality."
        />
      </div>

      <div className="mt-14 md:mt-16 overflow-x-hidden py-2" aria-hidden="true">
        <div className="flex gap-4 md:gap-6 w-max animate-marquee">
          {loop.map((c, i) => <Chip key={i} {...c} />)}
        </div>
      </div>
    </section>
  );
}