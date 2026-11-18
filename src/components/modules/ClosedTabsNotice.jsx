import React from "react";
import { Lock } from "lucide-react";

/** Shown when every tab of a screen is closed in Admin › Modules. */
export default function ClosedTabsNotice() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-2">
      <Lock className="w-8 h-8 text-slate-400 mx-auto" />
      <p className="font-semibold text-slate-900">Every tab on this screen is closed</p>
      <p className="text-sm text-slate-500">An administrator can reopen them in Admin › Modules.</p>
    </div>
  );
}