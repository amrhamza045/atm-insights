import { useRef } from "react";

// Uncontrolled on purpose: a native date input keeps a partial value (day/month
// typed, year still empty) in its own internal state. Passing React's value back
// in wipes that partial state, which is why the year segment could never be typed.
// Shared by the Inventory and Catering duration filters so the fix lives once.
export default function UncontrolledDateInput({ value, onCommit, className }) {
  const ref = useRef(null);

  // Sync only when the outside value really differs from what the field shows
  // (presets / Clear), never while the user is mid-typing.
  const attach = (el) => {
    ref.current = el;
    if (el && el !== document.activeElement && el.value !== (value || "")) {
      el.value = value || "";
    }
  };

  return (
    <input
      ref={attach}
      type="date"
      defaultValue={value || ""}
      className={className || "h-7 w-[8.75rem] px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"}
      onChange={(e) => {
        const next = e.target.value;
        if (!next || /^\d{4}-\d{2}-\d{2}$/.test(next)) onCommit(next);
      }}
    />
  );
}