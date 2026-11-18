import { Button } from "@/components/ui/button";
import { Phone, LogIn } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function GuestMenuItemCTA() {
  return (
    <div className="flex gap-1">
      <Button
        asChild
        size="sm"
        variant="outline"
        className="flex-1 w-full border-green-400 text-green-600 hover:bg-green-50 h-8 text-xs"
      >
        <a href="tel:01099003309">
          <Phone className="w-3 h-3 mr-1" />
          كلمنا عشان تطلب
        </a>
      </Button>
      <Button 
        size="sm" 
        variant="ghost"
        className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        onClick={() => base44.auth.redirectToLogin()}
      >
        <LogIn className="w-3 h-3" />
      </Button>
    </div>
  );
}