import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import { useModuleAccess } from "@/hooks/useModuleAccess";

/** Shown only to accounts linked to a catering client — their way into the portal. */
export default function PortalNavLink({ currentUser }) {
  const { isRouteOpen } = useModuleAccess();
  if (!currentUser?.portal_client_id || !isRouteOpen("CateringPortal")) return null;
  return (
    <Button asChild variant="ghost" size="sm" className="gap-1 px-2 sm:px-3 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
      <Link to="/CateringPortal">
        <PartyPopper className="w-4 h-4" />
        <span className="hidden md:inline text-xs sm:text-sm font-semibold">My Events</span>
      </Link>
    </Button>
  );
}