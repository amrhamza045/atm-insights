import React from "react";

// Nav link with an animated underline that grows from the center on hover.
// Text color is fully controlled by the caller via className (header swaps it live).
export default function LandingNavLink({ as: As = "a", className = "", underlineClassName = "", children, ...props }) {
  return (
    <As className={`relative group transition-colors duration-300 ${className}`} {...props}>
      {children}
      <span className={`absolute left-1/2 -bottom-1.5 h-px w-0 -translate-x-1/2 transition-all duration-300 group-hover:w-full ${underlineClassName}`} />
    </As>
  );
}