import React, { useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReferralFormDialog from "@/components/eventpass/ReferralFormDialog";

export default function ReferralCashbackCard({ token }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-3xl border border-[#e6dcc6] bg-gradient-to-br from-[#fdfaf3] to-[#f6f1e7] p-6 sm:p-8 text-center">
      <span className="inline-flex w-12 h-12 rounded-full bg-white items-center justify-center shadow-sm">
        <Gift className="w-6 h-6 text-[#a8853f]" />
      </span>
      <h3 className="mt-4 text-xl font-semibold text-slate-900">Invite others & earn cashback</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 max-w-xl mx-auto">
        Planning another event? Refer businesses, wedding organizers, families, organizations or friends
        who book catering with us and receive{" "}
        <span className="font-semibold text-[#a8853f]">5% cashback</span> as a thank-you for your referral.
      </p>
      <Button variant="outline" onClick={() => setOpen(true)}
        className="mt-5 h-12 px-6 rounded-xl border-[#a8853f] text-[#8c6d2f] hover:bg-[#f3e9d4]">
        <Sparkles className="w-4 h-4 mr-2" /> Refer someone
      </Button>

      <ReferralFormDialog open={open} onOpenChange={setOpen} token={token} />
    </div>
  );
}