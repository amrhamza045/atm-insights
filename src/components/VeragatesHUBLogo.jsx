import React from "react";

const VERAGATES_LOGO_URL =
  "https://media.base44.com/images/public/69709def3c5445d198d66244/3e672a413_img-a820cf20-b513-4b73-84b3-12b205524572.png";

export default function VeragatesHUBLogo({ className = "h-8" }) {
  return (
    <img
      src={VERAGATES_LOGO_URL}
      alt="Veragates HUB — Where Trust Meets Technology"
      className={`h-auto w-auto object-contain ${className}`}
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}
    />
  );
}