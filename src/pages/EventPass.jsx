import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import RestaurantLogo from "@/components/RestaurantLogo";
import PassEventInfo from "@/components/eventpass/PassEventInfo";
import AttendeeConfirmForm from "@/components/eventpass/AttendeeConfirmForm";
import AttendancePass from "@/components/eventpass/AttendancePass";
import ReferralCashbackCard from "@/components/eventpass/ReferralCashbackCard";
import PassLanguageToggle from "@/components/eventpass/PassLanguageToggle";
import { passT } from "@/components/eventpass/passStrings";

export default function EventPass() {
  const token = new URLSearchParams(window.location.search).get("t");
  const [lang, setLang] = useState("en");
  const [state, setState] = useState({ loading: true, error: "", invitation: null, event: null });
  const t = passT(lang);

  const call = async (payload) => {
    const res = await base44.functions.invoke("rsvpInvitation", { token, ...payload });
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
  };

  useEffect(() => {
    if (!token) return setState({ loading: false, error: "invalid_link", invitation: null, event: null });
    call({ action: "get" })
      .then((data) => setState({ loading: false, error: "", invitation: data.invitation, event: data.event }))
      .catch((err) => setState({ loading: false, error: err.message, invitation: null, event: null }));
  }, [token]);

  const confirm = async (values) => {
    const data = await call({ action: "confirm_attendance", ...values });
    setState((s) => ({ ...s, invitation: data.invitation, event: data.event }));
  };

  const confirmed = state.invitation?.rsvp_status === "attending" && !!state.invitation?.pass_code;
  const declined = state.invitation?.rsvp_status === "declined";

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-gradient-to-b from-[#fbf8f2] via-white to-[#f7f4ee] px-4 py-10 sm:py-14">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto space-y-8">
        <PassLanguageToggle lang={lang} onChange={setLang} />

        <div className="text-center">
          <RestaurantLogo className="h-28 sm:h-36 mx-auto" />
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-[#a8853f]">{t("invited_to_attend")}</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-slate-900 leading-tight">
            {(state.event?.event_name || t("our_event")).split("—").pop().trim()}
          </h1>
        </div>

        {state.loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-[#a8853f]" />
          </div>
        ) : state.error ? (
          <div className="rounded-3xl bg-white border border-[#ece4d4] p-8 text-center shadow-sm">
            <p className="text-slate-700">{state.error === "invalid_link" ? t("invalid_link") : state.error}</p>
          </div>
        ) : confirmed ? (
          <>
            <AttendancePass invitation={state.invitation} event={state.event} t={t} />
            <ReferralCashbackCard token={token} />
          </>
        ) : declined ? (
          <div className="rounded-3xl bg-white border border-[#ece4d4] p-8 text-center shadow-sm space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">{t("thanks_letting_know")}</h2>
            <p className="text-sm text-slate-600">{t("sorry_cant_make_it")}</p>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-white border border-[#ece4d4] p-6 sm:p-8 shadow-sm">
              <PassEventInfo event={state.event} t={t} />
            </div>

            <div className="rounded-3xl bg-white border border-[#ece4d4] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-slate-900">{t("welcome")}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {state.invitation?.rsvp_status === "maybe" ? t("maybe_note") : t("invite_note")}
                </p>
              </div>
              <AttendeeConfirmForm defaults={state.invitation} onConfirm={confirm} t={t} />
            </div>

            <ReferralCashbackCard token={token} />
          </>
        )}

        <p className="text-center text-xs text-slate-400">{t("powered_by")}</p>
      </motion.div>
    </div>
  );
}