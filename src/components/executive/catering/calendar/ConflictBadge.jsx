import React from "react";
import { TriangleAlert } from "lucide-react";

// Severity → ring color + badge treatment. Kept here so the chip stays presentational.
export const CONFLICT_RING = {
  hard: "#dc2626",
  soft: "#d97706",
  override: "#94a3b8",
};

export default function ConflictBadge({ severity, className = "" }) {
  if (!severity) return null;
  const color = CONFLICT_RING[severity] || CONFLICT_RING.override;
  const solid = severity === "hard";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${className}`}
      style={{
        backgroundColor: solid ? color : "#ffffff",
        border: `1px solid ${color}`,
        width: 14,
        height: 14,
      }}
    >
      <TriangleAlert className="w-2.5 h-2.5" style={{ color: solid ? "#ffffff" : color }} strokeWidth={2.5} />
    </span>
  );
}