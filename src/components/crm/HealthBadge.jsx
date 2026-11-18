import React from "react";
import { HEALTH_META } from "./rfmEngine";

export default function HealthBadge({ label }) {
  const meta = HEALTH_META[label] || HEALTH_META.Unranked;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
      {label}
    </span>
  );
}