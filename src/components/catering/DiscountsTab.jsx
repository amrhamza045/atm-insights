import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Percent } from "lucide-react";
import useOpenTab from "@/hooks/useOpenTab";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import EventDiscountsPanel from "./EventDiscountsPanel";
import EventTypeDiscountsPanel from "./EventTypeDiscountsPanel";
import { useCateringDiscountAccess } from "./useCateringDiscountAccess";

export default function DiscountsTab({ event = null }) {
  const { user } = useCateringDiscountAccess();
  // Both views can be closed in Admin › Modules, per role or per user.
  const view = useOpenTab("CateringDiscounts", ["event", "event_type"]);

  // While an event is scoped, only the per-event view is meaningful — an event has
  // exactly one type, so the "By event type" aggregate is hidden.
  if (event) {
    if (!view.isOpen("event")) return <ClosedTabsNotice />;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="w-4 h-4 text-amber-600" />
            Discount management · {event.event_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventDiscountsPanel actorEmail={user?.email} eventId={event.id} />
        </CardContent>
      </Card>
    );
  }

  if (!view.value) return <ClosedTabsNotice />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Percent className="w-4 h-4 text-amber-600" />
          Discount management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={view.value} onValueChange={view.setValue}>
          <TabsList className="mb-4">
            {view.isOpen("event") && <TabsTrigger value="event">By event</TabsTrigger>}
            {view.isOpen("event_type") && <TabsTrigger value="event_type">By event type</TabsTrigger>}
          </TabsList>
          <TabsContent value="event">
            <EventDiscountsPanel actorEmail={user?.email} />
          </TabsContent>
          <TabsContent value="event_type">
            <EventTypeDiscountsPanel actorEmail={user?.email} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}