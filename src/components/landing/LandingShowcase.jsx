import React from "react";
import { motion } from "framer-motion";
import { SHOWCASE } from "./landingContent";
import LandingSectionTitle from "./LandingSectionTitle";

// Asymmetric collage: rows alternate 7/5 and 5/7 columns.
const SPANS = ["md:col-span-7", "md:col-span-5", "md:col-span-5", "md:col-span-7"];

export default function LandingShowcase() {
  return (
    <section id="showcase" className="bg-[hsl(var(--landing-ivory))] py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <LandingSectionTitle
          title="Occasions we love to cater"
          subtitle="Every event is different. Our menus, service style and setup adapt to yours."
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-14">
          {SHOWCASE.map(({ title, text, image }, i) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className={`group ${SPANS[i] || "md:col-span-6"}`}
            >
              <div className="overflow-hidden aspect-[4/3]">
                <img src={image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <span className="block mt-6 h-px w-12 bg-[hsl(var(--landing-gold))]" aria-hidden="true" />
              <h3 className="font-heading mt-4 text-2xl text-[hsl(var(--landing-navy))]">{title}</h3>
              <p className="mt-2 text-sm md:text-base text-[hsl(var(--landing-navy)/0.65)] leading-relaxed max-w-lg">{text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}