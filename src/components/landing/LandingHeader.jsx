import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import LandingNavLink from "./LandingNavLink";
import LandingLanguageToggle from "./LandingLanguageToggle";

const NAV_ITEMS = [
  { label: "Packages", href: "#packages" },
  { label: "Our services", href: "#features" },
  { label: "Occasions", href: "#showcase" },
  { label: "How to book", href: "#how-it-works" },
];

const TOP_THRESHOLD = 60;

export default function LandingHeader({ brand, onSignIn, onContact, signInLabel = "Sign in", showPackages = true }) {
  const name = brand?.brand_name || "Rosemary";
  const navItems = showPackages ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.href !== "#packages");
  const handleContact = () => {
    setMenuOpen(false);
    onContact();
  };
  const [atTop, setAtTop] = useState(true);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const goingDown = y > lastScrollY.current;
      setAtTop(y < TOP_THRESHOLD);
      setVisible(!goingDown || y < TOP_THRESHOLD);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Solid (white) background: whenever hovered, menu is open, or scrolled past the top.
  const solid = hovered || menuOpen || !atTop;
  const inkClass = "text-[hsl(var(--landing-ivory)/0.9)] hover:text-[hsl(var(--landing-ivory))]";
  const brandInkClass = "text-[hsl(var(--landing-ivory))]";
  const underlineClass = solid ? "bg-[hsl(var(--landing-gold))]" : "bg-[hsl(var(--landing-ivory))]";

  return (
    <header
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      } ${solid ? "bg-[hsl(var(--landing-navy)/0.85)] shadow-sm backdrop-blur" : "bg-transparent"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
        <a href="#top" className="flex items-center gap-3 md:flex-1 min-w-0 flex-1">
          {(brand?.landing_logo_url || brand?.logo_url) ? (
            <img src={brand.landing_logo_url || brand.logo_url} alt={name} className="h-11 w-auto object-contain rounded-md" />
          ) : (
            <div className="h-11 w-11 rounded-full bg-[hsl(var(--landing-gold))] text-[hsl(var(--landing-navy))] flex items-center justify-center font-heading font-semibold">
              {name.charAt(0)}
            </div>
          )}
          <span data-no-translate className={`font-heading text-2xl font-semibold tracking-tight transition-colors duration-300 ${brandInkClass}`}>
            {name}
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-9 text-sm font-medium">
          {navItems.map((item) =>
            item.isRoute ? (
              <LandingNavLink as={Link} key={item.label} to={item.to} className={inkClass} underlineClassName={underlineClass}>{item.label}</LandingNavLink>
            ) : (
              <LandingNavLink key={item.label} href={item.href} className={inkClass} underlineClassName={underlineClass}>{item.label}</LandingNavLink>
            )
          )}
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3 md:flex-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleContact}
            className="inline-flex items-center justify-center leading-none h-10 px-4 sm:px-6 rounded-full border border-[hsl(var(--landing-ivory)/0.6)] text-[hsl(var(--landing-ivory))] text-sm font-semibold hover:bg-[hsl(var(--landing-ivory)/0.12)] hover:border-[hsl(var(--landing-ivory))] transition-all duration-300"
          >
            Contact Us
          </button>
          <button
            type="button"
            onClick={onSignIn}
            className="hidden sm:inline-flex items-center justify-center leading-none h-10 px-6 rounded-full border border-[hsl(var(--landing-gold))] bg-[hsl(var(--landing-gold))] text-[hsl(var(--landing-navy))] text-sm font-semibold shadow-sm hover:bg-[hsl(var(--landing-gold)/0.85)] hover:shadow-md transition-all duration-300"
          >
            {signInLabel}
          </button>
          <LandingLanguageToggle />

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className={`md:hidden h-10 w-10 -mr-2 flex items-center justify-center transition-colors duration-300 ${brandInkClass}`}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden overflow-hidden border-t border-[hsl(var(--landing-ivory)/0.1)] bg-[hsl(var(--landing-navy)/0.95)]"
          >
            <div className="px-4 sm:px-6 py-5 flex flex-col gap-4 text-sm font-medium text-[hsl(var(--landing-ivory)/0.85)]">
              {navItems.map((item) =>
                item.isRoute ? (
                  <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} className="py-1">
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="py-1">
                    {item.label}
                  </a>
                )
              )}
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onSignIn(); }}
                className="mt-2 inline-flex items-center justify-center leading-none h-10 px-6 rounded-full border border-[hsl(var(--landing-gold))] bg-[hsl(var(--landing-navy))] text-[hsl(var(--landing-ivory))] font-semibold"
              >
                {signInLabel}
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}