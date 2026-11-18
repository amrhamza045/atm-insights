import React from "react";
import { brandName } from "@/lib/brandName";
import { CalendarDays, Clock, MapPin, Building2 } from "lucide-react";

const Row = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <span className="w-9 h-9 rounded-full bg-[#f6f1e7] flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-[#a8853f]" />
    </span>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm text-slate-800 break-words">{value}</p>
    </div>
  </div>
);

export default function PassEventInfo({ event, t = (k) => k }) {
  if (!event) return null;
  const time = [event.start_time, event.end_time].filter(Boolean).join(" – ");
  const place = [event.venue_name, event.venue_address].filter(Boolean).join(", ");

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <Row icon={CalendarDays} label={t("date")} value={event.event_date || t("tba")} />
      <Row icon={Clock} label={t("time")} value={time || t("tba")} />
      <Row icon={MapPin} label={t("location")} value={place || t("tba")} />
      <Row icon={Building2} label={t("organizer")} value={event.organizer || brandName()} />
    </div>
  );
}