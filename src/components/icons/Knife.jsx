import React from "react";

export function Knife({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Cleaver blade (rectangular, square tip) - diagonal from bottom-left to top-right */}
      <path d="M2 14 L2 4 L14 4 L14 14 Z" fill="currentColor" fillOpacity="0.12" />
      {/* Hanging hole in top-left corner of blade */}
      <circle cx="4.5" cy="6.5" r="1" />
      {/* Shine star on left edge near hole */}
      <path d="M7 8 L7.6 9.2 L8.8 9.8 L7.6 10.4 L7 11.6 L6.4 10.4 L5.2 9.8 L6.4 9.2 Z" fill="currentColor" stroke="none" fillOpacity="0.7" />
      {/* Bolster (transition between blade and handle) */}
      <path d="M14 5 L16.5 5 L16.5 13 L14 13 Z" fill="currentColor" fillOpacity="0.25" />
      {/* Handle (black grip, extends diagonally up-right) */}
      <path d="M16.5 5.5 L21.5 3 L22 4.5 L17.5 7.5 Z" fill="currentColor" fillOpacity="0.85" />
      {/* Three rivets on handle */}
      <circle cx="17.4" cy="6.6" r="0.35" fill="#FFFFFF" stroke="none" />
      <circle cx="18.9" cy="5.9" r="0.35" fill="#FFFFFF" stroke="none" />
      <circle cx="20.4" cy="5.2" r="0.35" fill="#FFFFFF" stroke="none" />
      {/* Blade edge highlight */}
      <path d="M2.5 13.5 L13.5 13.5" strokeOpacity="0.4" />
    </svg>
  );
}

export default Knife;