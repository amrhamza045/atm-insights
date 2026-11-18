import ReportCard from "@/components/executive/kit/ReportCard";

// A card that lists clients or staff by name. rows arrive as null for people
// who can't open clients in CRM, who see why the list is empty instead.
export default function NamedListCard({ title, info, subtitle, rows, className, children }) {
  return (
    <ReportCard title={title} info={info} subtitle={subtitle} className={className}>
      {rows === null
        ? <p className="py-6 text-center text-sm text-slate-500">Names are shown to people who can open clients in CRM.</p>
        : children}
    </ReportCard>
  );
}