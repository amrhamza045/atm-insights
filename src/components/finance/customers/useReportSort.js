import { useRef, useState } from "react";
import { animate } from "framer-motion";

// Column sort state shared by the dropdown and the table headings. The
// dropdown picks a column in its natural direction (names A–Z, figures highest first).
export function useReportSort(initial = "balance") {
  const [sort, setSort] = useState({ key: initial, dir: initial === "name" ? "asc" : "desc" });
  const pick = (key) => setSort({ key, dir: key === "name" ? "asc" : "desc" });
  return { sort, setSort, pick };
}

// Springs the window so the report section's top sits just under the fixed header.
export function useSpringScroll(offset = 80) {
  const ref = useRef(null);
  const scrollToTop = () => {
    if (!ref.current) return;
    const target = Math.max(0, window.scrollY + ref.current.getBoundingClientRect().top - offset);
    animate(window.scrollY, target, { type: "spring", stiffness: 120, damping: 20, mass: 0.8, onUpdate: (v) => window.scrollTo(0, v) });
  };
  return { ref, scrollToTop };
}