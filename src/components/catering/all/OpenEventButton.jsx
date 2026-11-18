import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cateringUrl } from "@/components/catering/cateringTabs";

/** Opens this tab scoped to one event, where all of its actions live. */
export default function OpenEventButton({ tab, eventId, label = "Open event" }) {
  return (
    <Button asChild size="sm" variant="outline" className="gap-1.5 h-8 flex-shrink-0">
      <Link to={cateringUrl(tab, eventId)}>
        <ArrowUpRight className="w-4 h-4" /> {label}
      </Link>
    </Button>
  );
}