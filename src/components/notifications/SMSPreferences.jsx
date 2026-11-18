import React, { useState } from "react";
import { brandName } from "@/lib/brandName";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Bell, Send } from "lucide-react";
import { toast } from "sonner";

export default function SMSPreferences() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: preferences } = useQuery({
    queryKey: ["smsPreferences", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const prefs = await base44.entities.SMSNotificationPreferences.filter({ user_id: currentUser.id });
      return prefs[0] || null;
    },
    enabled: !!currentUser?.id
  });

  const [formData, setFormData] = useState({
    phone_number: "",
    order_confirmations: true,
    delivery_assignments: true,
    low_stock_alerts: true,
    promotional_messages: false
  });

  React.useEffect(() => {
    if (preferences) {
      setFormData({
        phone_number: preferences.phone_number || "",
        order_confirmations: preferences.order_confirmations !== false,
        delivery_assignments: preferences.delivery_assignments !== false,
        low_stock_alerts: preferences.low_stock_alerts !== false,
        promotional_messages: preferences.promotional_messages || false
      });
    }
  }, [preferences]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (preferences) {
        return base44.entities.SMSNotificationPreferences.update(preferences.id, data);
      } else {
        return base44.entities.SMSNotificationPreferences.create({
          ...data,
          user_id: currentUser.id,
          user_email: currentUser.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smsPreferences"] });
      toast.success("SMS preferences saved");
    }
  });

  const testSmsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('sendSMS', {
        phone_number: formData.phone_number,
        message: `Test SMS from ${brandName()} Partnership System. Your SMS notifications are working correctly!`
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Test SMS sent successfully!");
    },
    onError: (error) => {
      toast.error("Failed to send test SMS: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          SMS Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Phone Number</Label>
            <Input
              type="tel"
              placeholder="+1234567890"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              required
            />
            <p className="text-xs text-slate-500 mt-1">Include country code (e.g., +20 for Egypt)</p>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Order Confirmations</Label>
                <p className="text-xs text-slate-500">Get SMS when orders are placed</p>
              </div>
              <Switch
                checked={formData.order_confirmations}
                onCheckedChange={(checked) => setFormData({ ...formData, order_confirmations: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Delivery Assignments</Label>
                <p className="text-xs text-slate-500">Get SMS for new delivery assignments</p>
              </div>
              <Switch
                checked={formData.delivery_assignments}
                onCheckedChange={(checked) => setFormData({ ...formData, delivery_assignments: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Low Stock Alerts</Label>
                <p className="text-xs text-slate-500">Get SMS when inventory is low</p>
              </div>
              <Switch
                checked={formData.low_stock_alerts}
                onCheckedChange={(checked) => setFormData({ ...formData, low_stock_alerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Promotional Messages</Label>
                <p className="text-xs text-slate-500">Receive special offers and promotions</p>
              </div>
              <Switch
                checked={formData.promotional_messages}
                onCheckedChange={(checked) => setFormData({ ...formData, promotional_messages: checked })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => testSmsMutation.mutate()}
              disabled={!formData.phone_number || testSmsMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              {testSmsMutation.isPending ? "Sending..." : "Test SMS"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}