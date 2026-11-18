import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import PackageSlide from "./PackageSlide";

const INTERVAL = 6000;

export default function PackageCarousel({ packages, onOpen }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const [dir, setDir] = useState(1);
  const go = (i) => {
    setDir(i === index - 1 ? -1 : 1);
    setIndex(i);
  };

  useEffect(() => {
    if (paused || packages.length < 2) return;
    const t = setTimeout(() => { setDir(1); setIndex((i) => (i + 1) % packages.length); }, INTERVAL);
    return () => clearTimeout(t);
  }, [index, paused, packages.length]);

  const pkg = packages[index];
  if (!pkg) return null;

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative overflow-hidden rounded-3xl">
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.div
            key={pkg.id}
            custom={dir}
            variants={{
              enter: (d) => (reduce ? { opacity: 0 } : { x: d < 0 ? "-100%" : "100%", zIndex: 2 }),
              center: reduce ? { opacity: 1 } : { x: 0, scale: 1, opacity: 1, zIndex: 2 },
              exit: (d) => (reduce ? { opacity: 0 } : { x: d < 0 ? "30%" : "-30%", scale: 0.92, opacity: 0.4, zIndex: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            className="relative"
            transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          >
            <PackageSlide pkg={pkg} onOpen={onOpen} />
          </motion.div>
        </AnimatePresence>
      </div>
      {packages.length > 1 && (
        <div className="flex gap-2 mt-6">
          {packages.map((p, i) => (
            <button key={p.id} onClick={() => go(i)} aria-label={p.name} className="h-1 flex-1 rounded-full bg-[hsl(var(--landing-navy)/0.12)] overflow-hidden">
              {i < index && <span className="block h-full w-full bg-[hsl(var(--landing-gold))]" />}
              {i === index && (
                <span
                  key={`${p.id}-${index}`}
                  className="block h-full bg-[hsl(var(--landing-gold))] origin-left"
                  style={{ animation: `pkgfill ${INTERVAL}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }}
                />
              )}
            </button>
          ))}
          <style>{`@keyframes pkgfill{from{width:0}to{width:100%}}`}</style>
        </div>
      )}
    </div>
  );
}