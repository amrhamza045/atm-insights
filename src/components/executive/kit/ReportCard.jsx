import InfoTip from "./InfoTip";

// The frame every Executive Dashboard chart or table sits in: a title with its
// (i) explanation (info: { metric } or { title, calculation, source }), an
// optional subtitle and actions, then the content.
export default function ReportCard({ title, info, subtitle, actions, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 font-heading text-base font-semibold text-navy">
            {title}
            {info && <InfoTip title={title} {...info} />}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}