import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Megaphone, Bell, ExternalLink } from "lucide-react";

export default function PromotionsDisplay({ clientId }) {
  const { data: notifications = [] } = useQuery({
    queryKey: ["promotionNotifications", clientId],
    queryFn: async () => {
      const allNotifications = await base44.entities.Notification.filter({
        client_id: clientId,
        type: "promotion"
      }, "-created_date", 10);
      return allNotifications;
    },
    enabled: !!clientId
  });

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <Megaphone className="w-5 h-5" />
          Special Offers & Promotions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 bg-white rounded-lg border-2 border-amber-200 ${
              !notification.read ? "shadow-md" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-amber-600" />
                  <h4 className="font-semibold text-slate-900">{notification.title}</h4>
                  {!notification.read && (
                    <Badge variant="default" className="bg-amber-500">New</Badge>
                  )}
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{notification.message}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(notification.created_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}