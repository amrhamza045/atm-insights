import React from "react";
import { openFile } from "@/lib/privateFiles";

/** Opens a stored receipt/proof (private or legacy public) in a new tab. */
export default function ReceiptLink({ value, className = "text-xs text-blue-600 hover:underline", children = "View receipt" }) {
  if (!value || value === "#") return null;
  return (
    <button type="button" className={className} onClick={() => openFile(value)}>
      {children}
    </button>
  );
}