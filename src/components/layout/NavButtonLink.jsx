import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// A header navigation link styled as a ghost button: its icon, plus its label from md screens up.
export default function NavButtonLink({ to, icon: Icon, label }) {
  return (
    <Button asChild variant="ghost" size="sm" className="gap-1 px-2 sm:px-3">
      <Link to={to}>
        <Icon className="w-4 h-4" />
        <span className="hidden md:inline text-xs sm:text-sm">{label}</span>
      </Link>
    </Button>
  );
}