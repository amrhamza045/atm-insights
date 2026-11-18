import React from "react";
import { UserPlus } from "lucide-react";
import ReferralsTab from "@/components/catering/ReferralsTab";

/**
 * Narrow carve-out screen for catering roles that could see Guest Referrals while
 * it lived under Catering, but have no wider CRM access. Only this one view is
 * rendered — no other CRM tab exists in their DOM, so a direct URL can't reach one.
 */
export default function ReferralsOnlyView() {
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-slate-700" />
        <h1 className="text-xl font-bold text-slate-900">Guest Referrals</h1>
      </div>
      <p className="text-sm text-slate-500">
        Referrals submitted by guests from their event pass. Update the status as you work each one.
      </p>
      <ReferralsTab />
    </div>
  );
}