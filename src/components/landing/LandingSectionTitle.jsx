import React from "react";

// Serif section title with the signature thin gold rule beneath it.
export default function LandingSectionTitle({ title, subtitle, light = false }) {
  return (
    <div className="text-center flex flex-col items-center gap-5">
      <h2 className={`font-heading text-3xl md:text-5xl font-medium tracking-tight ${light ? "text-[hsl(var(--landing-ivory))]" : "text-[hsl(var(--landing-navy))]"}`}>
        {title}
      </h2>
      <span className="block h-px w-24 bg-[hsl(var(--landing-gold))]" aria-hidden="true" />
      {subtitle && (
        <p className={`max-w-2xl text-base md:text-lg leading-relaxed ${light ? "text-[hsl(var(--landing-ivory)/0.75)]" : "text-[hsl(var(--landing-navy)/0.65)]"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}