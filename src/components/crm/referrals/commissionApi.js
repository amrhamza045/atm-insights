import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { referrerKeyOf } from "./referrerKey";

const today = () => format(new Date(), "yyyy-MM-dd");

export const blankCommissionForm = () => ({
  event_id: "", amount: "", paid: false, paid_date: today(), payment_reference: "", notes: "",
});

export const commissionToForm = (c) => ({
  event_id: c.event_id || "",
  amount: String(c.amount ?? ""),
  paid: c.status === "paid",
  paid_date: c.paid_date || today(),
  payment_reference: c.payment_reference || "",
  notes: c.notes || "",
});

export function validateCommission(form) {
  if (!form.event_id) return "Choose the event that earns this commission";
  if (!(Number(form.amount) > 0)) return "Enter a commission amount above zero";
  return null;
}

// Cancelled events never earn a commission, and each event earns one per referral.
export function eventOptions(events, takenEventIds = [], commission) {
  return events
    .filter((e) => e.id === commission?.event_id || (e.status !== "cancelled" && !takenEventIds.includes(e.id)))
    .map((e) => ({
      value: e.id,
      label: e.event_name || "Untitled event",
      sub: [e.client_name, e.event_date && format(new Date(e.event_date), "dd MMM yyyy")].filter(Boolean).join(" · "),
    }));
}

export function saveCommission({ referral, commission, form, event, userEmail }) {
  const paid = form.paid;
  const data = {
    event_id: form.event_id,
    event_name: event?.event_name || commission?.event_name || "",
    event_date: event?.event_date || commission?.event_date,
    amount: Number(form.amount),
    status: paid ? "paid" : "unpaid",
    paid_date: paid ? form.paid_date || today() : null,
    paid_by: paid ? (commission?.status === "paid" && commission.paid_by) || userEmail || "" : "",
    payment_reference: paid ? form.payment_reference.trim() : "",
    notes: form.notes.trim(),
  };
  if (commission) return base44.entities.ReferralCommission.update(commission.id, data);
  return base44.entities.ReferralCommission.create({
    ...data,
    lead_id: referral.id,
    referred_name: referral.sender_name || "",
    referrer_key: referrerKeyOf(referral),
    referrer_name: referral.referrer_name || "",
    referrer_phone: referral.referrer_phone || "",
    referrer_email: referral.referrer_email || "",
  });
}

export const deleteCommission = (id) => base44.entities.ReferralCommission.delete(id);

export function refreshCommissions(queryClient) {
  queryClient.invalidateQueries({ queryKey: ["referral-commissions"] });
  queryClient.invalidateQueries({ queryKey: ["referral-commission-totals"] });
}