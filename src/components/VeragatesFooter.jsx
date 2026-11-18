import React from "react";
import { Mail, Globe, Phone, ArrowUpRight } from "lucide-react";

const links = [
  { icon: Mail, label: "info@veragates.com", href: "mailto:info@veragates.com" },
  { icon: Globe, label: "www.veragates.com", href: "https://www.veragates.com", external: true },
  { icon: Phone, label: "+20 106 668 1368", href: "tel:+201066681368" },
];

export default function VeragatesFooter({ className = "bg-slate-900 mt-12" }) {
  return (
    <footer className={`${className} text-slate-300 print:hidden`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-6 border-t border-white/10 pt-8">
          <div className="text-center md:text-left">
            <p className="text-xl md:text-2xl font-semibold text-white text-center">Powered by Veragates HUB</p>
            <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2">
              {links.map(({ icon: Icon, label, href, external }) => (
                <a key={href} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-sky-400 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-sky-400" />
                  <span dir="ltr">{label}</span>
                  {external && <ArrowUpRight className="w-3 h-3" />}
                </a>
              ))}
            </div>
          </div>
          <img
            src="https://media.base44.com/images/public/6a8b0b3fb73ae7d930386c1d/50f9927af_2.png"
            alt="VeraKit 360"
            className="h-14 object-contain"
          />
        </div>
        <p dir="auto" className="text-center mt-8 pt-6 border-t border-white/10 text-xs text-slate-500">
          © {new Date().getFullYear()} VeraKit 360 by Veragates HUB. All rights reserved.
        </p>
      </div>
    </footer>
  );
}