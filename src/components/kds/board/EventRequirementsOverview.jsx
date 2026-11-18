import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Users } from "lucide-react";

export default function EventRequirementsOverview({ batches }) {
  const events = Object.values(batches.reduce((acc, b) => {
    const key = b.catering_event_id || b.catering_event_name;
    acc[key] ||= { key, name: b.catering_event_name || "Event", date: b.needed_by_date, guests: b.catering_guests, items: [], done: 0 };
    acc[key].items.push(b);
    if (b.prep_stage === "handed_off") acc[key].done += 1;
    return acc;
  }, {})).sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (!events.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mb-6">
      {events.map((e) => (
        <Card key={e.key} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-semibold text-foreground truncate">{e.name}</p>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{e.done}/{e.items.length} done</span>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{e.date || "—"}</span>
              {!!e.guests && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{e.guests} persons</span>}
            </div>
            <ul className="space-y-1 text-sm">
              {e.items.map((b) => (
                <li key={b.id} className="flex justify-between gap-2">
                  <span className="truncate">{b.output_item_name || b.recipe_name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{b.required_output_quantity || b.target_quantity} {b.output_unit || ""}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}