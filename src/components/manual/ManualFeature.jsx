import { motion } from "framer-motion";

const ACCENTS = {
  indigo: {
    header: "bg-indigo-50 border-indigo-100",
    icon: "text-indigo-600",
    badge: "bg-indigo-600 text-white",
    bullet: "bg-indigo-500",
  },
  emerald: {
    header: "bg-emerald-50 border-emerald-100",
    icon: "text-emerald-600",
    badge: "bg-emerald-600 text-white",
    bullet: "bg-emerald-500",
  },
  amber: {
    header: "bg-amber-50 border-amber-100",
    icon: "text-amber-600",
    badge: "bg-amber-600 text-white",
    bullet: "bg-amber-500",
  },
  sky: {
    header: "bg-sky-50 border-sky-100",
    icon: "text-sky-600",
    badge: "bg-sky-600 text-white",
    bullet: "bg-sky-500",
  },
  purple: {
    header: "bg-purple-50 border-purple-100",
    icon: "text-purple-600",
    badge: "bg-purple-600 text-white",
    bullet: "bg-purple-500",
  },
};

export default function ManualFeature({ index, icon: Icon, title, subtitle, sections, accent = "indigo" }) {
  const a = ACCENTS[accent] || ACCENTS.indigo;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className={`flex items-start gap-4 p-6 border-b ${a.header}`}>
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
          <Icon className={`w-6 h-6 ${a.icon}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.badge}`}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          </div>
          <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {sections.map((section, i) => (
          <div key={i} className="border-l-2 border-slate-100 pl-4">
            <h4 className="font-semibold text-slate-800 mb-1 text-sm">{section.heading}</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{section.body}</p>
            {section.items && (
              <ul className="mt-2 space-y-1">
                {section.items.map((item, j) => (
                  <li key={j} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.bullet}`} />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
}