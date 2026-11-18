import React, { useState, useEffect } from "react";
import { Mic } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import VoiceOrderModal from "./VoiceOrderModal";
import { useLanguage } from "@/components/LanguageProvider";

export default function VoiceOrderButton({ inline = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useLanguage();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const handleClick = () => {
    if (!currentUser) {
      toast.info("Please log in to order by voice");
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      {/* Pill-shaped Voice Order Button */}
      <button
        onClick={handleClick}
        disabled={isLoading}
        data-capture-id="voice-order"
        className={`${inline ? "flex-shrink-0" : "fixed bottom-20 md:bottom-6 right-4 z-40"} flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100`}
        aria-label="Order by Voice"
      >
        <Mic className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-lg leading-none">🎙️</span>
        <span className="font-bold text-sm whitespace-nowrap">{language === "ar" ? "اطلب بصوتك" : "Order by Voice"}</span>
      </button>

      <VoiceOrderModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}