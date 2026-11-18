import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Zap, Gift, PoundSterling, Megaphone, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferences({ userId }) {
  const [preferences, setPreferences] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    if (userData?.notification_preferences) {
      setPreferences(userData.notification_preferences);
    } else {
      // Default preferences
      setPreferences({
        push_enabled: true,
        email_enabled: true,
        payout_approvals: true,
        reward_redemptions: true,
        significant_cashback: true,
        promotions: false,
        tier_updates: true
      });
    }
  }, [userData]);

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        notification_preferences: preferences
      });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      toast.success("Notification preferences saved!");
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  // Request push notification permission
  const handleEnablePushNotifications = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        toast.success("Push notifications are already enabled");
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPreferences(prev => ({
          ...prev,
          push_enabled: true
        }));
        toast.success("Push notifications enabled!");
      } else {
        toast.error("Push notification permission denied");
      }
    } else {
      toast.error("Your browser doesn't support push notifications");
    }
  };

  if (!preferences) return null;

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how and when you receive notifications about important events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery Methods */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Delivery Methods</h3>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex-1">
                <p className="font-medium text-slate-900">Push Notifications</p>
                <p className="text-sm text-slate-500">Receive browser notifications</p>
              </div>
              <div className="flex items-center gap-3">
                {!preferences.push_enabled && 'Notification' in window && Notification.permission !== 'granted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEnablePushNotifications}
                    className="text-xs"
                  >
                    Enable
                  </Button>
                )}
                <Switch
                  checked={preferences.push_enabled}
                  onCheckedChange={() => handleToggle('push_enabled')}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex-1">
                <p className="font-medium text-slate-900">Email Notifications</p>
                <p className="text-sm text-slate-500">Receive email alerts</p>
              </div>
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={() => handleToggle('email_enabled')}
              />
            </div>
          </div>

          {/* Event Types */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Notification Types</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <PoundSterling className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Payout Approvals</p>
                    <p className="text-sm text-slate-500">When your withdrawal is processed</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.payout_approvals}
                  onCheckedChange={() => handleToggle('payout_approvals')}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Reward Redemptions</p>
                    <p className="text-sm text-slate-500">When rewards are redeemed or used</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.reward_redemptions}
                  onCheckedChange={() => handleToggle('reward_redemptions')}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Significant Cashback</p>
                    <p className="text-sm text-slate-500">When you earn notable cashback amounts</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.significant_cashback}
                  onCheckedChange={() => handleToggle('significant_cashback')}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Tier Updates</p>
                    <p className="text-sm text-slate-500">When you reach a new tier level</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.tier_updates}
                  onCheckedChange={() => handleToggle('tier_updates')}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Promotions & Updates</p>
                    <p className="text-sm text-slate-500">Marketing messages and special offers</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.promotions}
                  onCheckedChange={() => handleToggle('promotions')}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}