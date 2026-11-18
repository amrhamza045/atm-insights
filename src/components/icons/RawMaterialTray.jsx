import React from "react";

export function RawMaterialTray({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Outer rim (top edge) */}
      <path d="M3 6 L21 5 L22 9 L4 10 Z" fill="currentColor" fillOpacity="0.08" />
      {/* Inner base with slight perspective */}
      <path d="M5 8.5 L19 7.7 L19.8 14 L5.8 14.5 Z" />
      {/* Vertical dividers across the tray */}
      <path d="M10 8.1 L10.3 14.3" />
      <path d="M14.5 7.85 L14.8 14.1" />
      {/* Diamond / cross-hatch texture on base */}
      <path d="M7 10 L9 11 M9 10 L7 11" strokeOpacity="0.6" />
      <path d="M11.5 9.8 L13.5 10.8 M13.5 9.8 L11.5 10.8" strokeOpacity="0.6" />
      <path d="M16 9.5 L18 10.5 M18 9.5 L16 10.5" strokeOpacity="0.6" />
      {/* Fluted side walls */}
      <path d="M4 10 L4.5 14.6 M8 9.7 L8.5 14.4 M15.5 9 L16 13.8 M19.8 8.8 L20.3 13.6" strokeOpacity="0.5" />
      {/* Bottom edge */}
      <path d="M5.8 14.5 L19.8 14" />
    </svg>
  );
}

export default RawMaterialTray;