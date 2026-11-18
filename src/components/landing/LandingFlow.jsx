import React from "react";
import { motion } from "framer-motion";
import { FLOW_STEPS } from "./landingContent";
import LandingSectionTitle from "./LandingSectionTitle";

// Rising bar graph: each step climbs higher toward "enjoy your event".
export default function LandingFlow() {
  const n = FLOW_STEPS.length;
  return (
    <section id="how-it-works" className="bg-[hsl(var(--landing-cream))] py-20 md:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <LandingSectionTitle
          title="Booking with us is simple"
          subtitle="Five easy steps from your first message to the last plate cleared."
        />

        <ol className="mt-16 grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-5 md:items-end">
          {FLOW_STEPS.map(({ title, text }, i) => {
            const pct = ((i + 1) / n) * 100;
            return (
              <li key={title} className="flex md:flex-col md:justify-end md:h-[26rem]">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  style={{ "--bar": `${40 + pct * 0.6}%` }}
                  className="relative w-full md:h-[var(--bar)] rounded-3xl bg-white shadow-sm border border-[hsl(var(--landing-gold)/0.25)] p-6 flex flex-col justify-between overflow-hidden group hover:shadow-lg transition-shadow"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[hsl(var(--landing-gold)/0.25)] to-transparent transition-all duration-500 group-hover:h-full"
                    style={{ height: `${pct * 0.5}%` }}
                  />
                  <div className="relative flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--landing-navy))] text-white font-semibold">{i + 1}</span>
                    <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[hsl(var(--landing-gold))]">Step {i + 1}</span>
                  </div>
                  <div className="relative mt-4">
                    <h3 className="font-heading text-xl text-[hsl(var(--landing-navy))] leading-snug">{title}</h3>
                    <p className="mt-2 text-sm text-[hsl(var(--landing-navy)/0.65)] leading-relaxed">{text}</p>
                  </div>
                </motion.div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}