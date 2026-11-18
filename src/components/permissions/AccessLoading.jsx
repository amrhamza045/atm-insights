import { Loader2 } from "lucide-react";

/**
 * Neutral placeholder shown while access (permissions / module state) is still
 * resolving. Deliberately NOT the real content: rendering children during the
 * loading window is what caused full pages to flash in before being gated.
 */
export default function AccessLoading({ className = "" }) {
  return (
    <div className={`min-h-[40vh] flex items-center justify-center ${className}`}>
      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
    </div>
  );
}