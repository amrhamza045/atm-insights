import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer, CheckCircle2 } from "lucide-react";
import PassEventInfo from "./PassEventInfo";

const qrUrl = (code) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(code)}`;

const SummaryRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-dashed border-slate-200 last:border-0">
    <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
    <span className="text-sm text-slate-800 text-right break-words">{value || "—"}</span>
  </div>
);

export default function AttendancePass({ invitation, event, t = (k) => k }) {
  const code = invitation.pass_code || invitation.guest_name;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <span className="inline-flex w-14 h-14 rounded-full bg-[#e8f2eb] items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-[#14452f]" />
        </span>
        <h2 className="mt-4 text-2xl sm:text-3xl font-semibold text-slate-900">{t("thank_you")}</h2>
        <p className="mt-2 text-slate-600">{t("confirmed_note")}</p>
      </div>

      <div className="rounded-3xl bg-white border border-[#ece4d4] p-6 sm:p-8 text-center shadow-sm">
        <img src={qrUrl(code)} alt="Your event entry QR code"
          className="mx-auto w-[220px] h-[220px] rounded-2xl bg-white" />
        <p className="mt-4 font-semibold tracking-wide text-slate-900">{t("entry_pass")}</p>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{t("entry_pass_note")}</p>
        <p className="mt-3 text-xs font-mono text-slate-400">{code}</p>

        <div className="mt-5 flex flex-wrap justify-center gap-2 print:hidden">
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <a href={qrUrl(code)} download={`entry-pass-${code}.png`} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" /> {t("save_pass")}
            </a>
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> {t("print_pass")}
          </Button>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-[#ece4d4] p-6 sm:p-8 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">{t("attendance_summary")}</h3>
        <SummaryRow label={t("attendee")} value={invitation.guest_name} />
        <SummaryRow label={t("phone")} value={invitation.phone} />
        <SummaryRow label={t("email")} value={invitation.email} />
        <SummaryRow label={t("event")} value={event?.event_name} />
        <SummaryRow label={t("date")} value={event?.event_date} />
        <SummaryRow label={t("time")} value={[event?.start_time, event?.end_time].filter(Boolean).join(" – ")} />
        <SummaryRow label={t("venue")} value={[event?.venue_name, event?.venue_address].filter(Boolean).join(", ")} />
        <SummaryRow label={t("status")} value={t("confirmed")} />
      </div>

      <div className="rounded-3xl bg-white border border-[#ece4d4] p-6 sm:p-8 shadow-sm">
        <PassEventInfo event={event} t={t} />
      </div>
    </div>
  );
}