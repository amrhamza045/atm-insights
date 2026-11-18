import React from "react";
import { Input } from "@/components/ui/input";
import { describeRange } from "./paymentPolicyLogic";
import PolicySection from "./PolicySection";

/** The booking window: how many days before the event date the booking is made. */
export default function PolicyRangeFields({ form, set, error }) {
  const dayInput = (field, label, placeholder) => (
    <Input
      type="number"
      min="0"
      step="1"
      inputMode="numeric"
      className="w-24"
      aria-label={label}
      placeholder={placeholder}
      value={form[field]}
      onChange={(e) => set({ [field]: e.target.value })}
    />
  );

  return (
    <PolicySection title="Booking window" hint="Counted from the day the event is requested to the event date.">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
        <span>Booked at least</span>
        {dayInput("min_days_before", "At least (days)")}
        <span>days and less than</span>
        {dayInput("max_days_before", "Less than (days)", "No limit")}
        <span>days before the event</span>
      </div>
      <p className="text-xs text-slate-500">
        Leave the second box empty for no upper limit.
        {form.min_days_before !== "" && ` Reads as: "${describeRange(form.min_days_before, form.max_days_before)}".`}
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </PolicySection>
  );
}