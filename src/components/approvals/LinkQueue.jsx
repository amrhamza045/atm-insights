import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

// Read-only queue: lists waiting items and sends the reviewer to the screen
// that owns the full action (these need forms that live in their own module).
export default function LinkQueue({ icon: Icon, title, items, to, actionLabel, renderLine }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Icon className="w-5 h-5 text-slate-500" /> {title} ({items.length})
        </h2>
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link to={to}>
            {actionLabel} <ExternalLink className="w-3 h-3" />
          </Link>
        </Button>
      </div>
      <Card className="border-warning-300 bg-warning-50/50">
        <CardContent className="pt-4 divide-y">
          {items.map((item) => (
            <div key={item.id} className="py-2 text-sm flex flex-wrap justify-between gap-2">
              {renderLine(item)}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}