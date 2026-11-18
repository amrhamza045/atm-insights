import { rangeLabel } from "@/components/executive/period/reportPeriod";

// Wording the Customers & growth tables share.
export const TYPE_LABELS = { corporate: "Corporate", individual: "Individual" };
export const dayLabel = (day) => (day ? rangeLabel({ from: day, to: day }) : "—");
// "Corporate · Sara Ali": a client's type and the person who looks after them.
export const clientDetail = (c) => [TYPE_LABELS[c.type], c.owner].filter(Boolean).join(" · ");