import React from "react";
import { motion } from "framer-motion";
import { FEATURES } from "./landingContent";
import LandingSectionTitle from "./LandingSectionTitle";

export default function LandingFeatureGrid() {
  return (
    <section id="features" className="bg-[hsl(var(--landing-ivory))] py-20 md:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <LandingSectionTitle title="Everything your event needs" />

        <p className="mt-16 mb-6 font-heading text-2xl text-[hsl(var(--landing-navy))]">Our services</p>
        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-[hsl(var(--landing-navy)/0.15)]">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`py-9 border-b border-[hsl(var(--landing-navy)/0.15)] ${i % 2 === 0 ? "md:pr-12" : "md:pl-12 md:border-l"}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-[hsl(var(--landing-gold))]" />
                <h3 className="font-heading text-xl md:text-2xl text-[hsl(var(--landing-navy))]">{title}</h3>
              </div>
              <p className="mt-3 text-sm md:text-base leading-relaxed text-[hsl(var(--landing-navy)/0.65)]">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}