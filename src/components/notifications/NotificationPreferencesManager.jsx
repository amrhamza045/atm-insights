import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, Smartphone, ShoppingCart, Megaphone, UtensilsCrossed, PoundSterling, Trophy, Info } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";

export default function NotificationPreferencesManager({ client }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");

  const { data: preferences } = useQuery({
    queryKey: ["notificationPrefs", client?.id],
    queryFn: async () => {
      const prefs = await base44.entities.UserNotificationPreferences.filter({ client_id: client.id });
      return prefs[0] || null;
    },
    enabled: !!client?.id
  });

  useEffect(() => {
    if (preferences?.phone) {
      setPhone(preferences.phone);
    } else if (client?.phone) {
      setPhone(client.phone);
    }
  }, [preferences, client]);

  const createPrefsMutation = useMutation({
    mutationFn: (data) => base44.entities.UserNotificationPreferences.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPrefs", client?.id] });
      toast.success(t("notificationPreferencesSaved") || "Notification preferences saved!");
    }
  });

  const updatePrefsMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserNotificationPreferences.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPrefs", client?.id] });
      toast.success(t("notificationPreferencesSaved") || "Notification preferences saved!");
    }
  });

  const handleToggle = async (field) => {
    const newValue = !preferences?.[field];
    
    if (!preferences) {
      await createPrefsMutation.mutateAsync({
        client_id: client.id,
        email: client.email,
        phone: phone || client.phone,
        [field]: newValue
      });
    } else {
      await updatePrefsMutation.mutateAsync({
        id: preferences.id,
        data: { [field]: newValue }
      });
    }
  };

  const handlePhoneUpdate = async () => {
    if (!phone || phone.trim() === "") {
      toast.error("Please enter a valid phone number");
      return;
    }

    if (!preferences) {
      await createPrefsMutation.mutateAsync({
        client_id: client.id,
        email: client.email,
        phone: phone,
        sms_enabled: true
      });
    } else {
      await updatePrefsMutation.mutateAsync({
        id: preferences.id,
        data: { phone: phone }
      });
    }
  };

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        toast.success("Push notifications are already enabled");
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success("Push notifications enabled!");
        handleToggle('push_enabled');
      } else {
        toast.error("Push notification permission denied");
      }
    } else {
      toast.error("Your browser doesn't support push notifications");
    }
  };

  const prefs = preferences || {
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    order_updates: true,
    order_placed: true,
    order_preparing: true,
    order_ready: true,
    order_completed: true,
    promotions: true,
    new_menu_items: true,
    special_offers: true,
    cashback_updates: true,
    referral_updates: true,
    payout_approvals: true,
    tier_updates: true
  };

  return (
    <div className="space-y-6">
      {/* Delivery Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t("notificationChannels") || "Notification Channels"}
          </CardTitle>
          <CardDescription>
            {t("chooseHowToReceive") || "Choose how you'd like to receive notifications"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Push Notifications */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{t("pushNotifications") || "Push Notifications"}</p>
                <p className="text-sm text-slate-500">{t("browserNotifications") || "Instant browser notifications"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!prefs.push_enabled && 'Notification' in window && Notification.permission !== 'granted' && (
                <Button size="sm" variant="outline" onClick={requestPushPermission}>
                  {t("enable") || "Enable"}
                </Button>
              )}
              <Switch
                checked={prefs.push_enabled}
                onCheckedChange={() => handleToggle('push_enabled')}
              />
            </div>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{t("emailNotifications") || "Email Notifications"}</p>
                <p className="text-sm text-slate-500">{client.email}</p>
              </div>
            </div>
            <Switch
              checked={prefs.email_enabled}
              onCheckedChange={() => handleToggle('email_enabled')}
            />
          </div>

          {/* SMS Notifications */}
          <div className="p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{t("smsNotifications") || "SMS Notifications"}</p>
                  <p className="text-sm text-slate-500">{t("textMessageAlerts") || "Text message alerts"}</p>
                </div>
              </div>
              <Switch
                checked={prefs.sms_enabled}
                onCheckedChange={() => handleToggle('sms_enabled')}
              />
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1">
                <Label className="text-xs text-slate-600 mb-1">{t("phoneNumber") || "Phone Number"}</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="text-sm"
                />
              </div>
              <Button 
                size="sm" 
                onClick={handlePhoneUpdate}
                className="mt-5"
                disabled={!phone || phone === preferences?.phone}
              >
                {t("update") || "Update"}
              </Button>
            </div>
            <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                {t("smsRequiresBackend") || "SMS notifications require backend functions to be enabled. Contact your administrator to enable this feature."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {t("orderNotifications") || "Order Notifications"}
          </CardTitle>
          <CardDescription>
            {t("stayUpdatedOrders") || "Stay updated on your order status"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <NotificationToggle
            icon={ShoppingCart}
            title={t("orderPlaced") || "Order Placed"}
            description={t("confirmationWhenOrdered") || "Confirmation when you place an order"}
            checked={prefs.order_placed}
            onToggle={() => handleToggle('order_placed')}
            color="blue"
          />
          <NotificationToggle
            icon={UtensilsCrossed}
            title={t("orderPreparing") || "Order Preparing"}
            description={t("kitchenStartedPreparing") || "When the kitchen starts preparing your order"}
            checked={prefs.order_preparing}
            onToggle={() => handleToggle('order_preparing')}
            color="orange"
          />
          <NotificationToggle
            icon={Bell}
            title={t("orderReady") || "Order Ready"}
            description={t("readyForPickup") || "When your order is ready for pickup or delivery"}
            checked={prefs.order_ready}
            onToggle={() => handleToggle('order_ready')}
            color="green"
          />
          <NotificationToggle
            icon={Trophy}
            title={t("orderCompleted") || "Order Completed"}
            description={t("deliveredOrPickedUp") || "When your order is delivered or picked up"}
            checked={prefs.order_completed}
            onToggle={() => handleToggle('order_completed')}
            color="purple"
          />
        </CardContent>
      </Card>

      {/* Marketing & Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            {t("marketingUpdates") || "Marketing & Updates"}
          </CardTitle>
          <CardDescription>
            {t("specialOffersNews") || "Special offers and menu updates"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <NotificationToggle
            icon={Megaphone}
            title={t("promotions") || "Promotions"}
            description={t("specialPromosDiscounts") || "Special promotions and discount codes"}
            checked={prefs.promotions}
            onToggle={() => handleToggle('promotions')}
            color="pink"
          />
          <NotificationToggle
            icon={UtensilsCrossed}
            title={t("newMenuItems") || "New Menu Items"}
            description={t("notifyNewDishes") || "Be the first to know about new dishes"}
            checked={prefs.new_menu_items}
            onToggle={() => handleToggle('new_menu_items')}
            color="amber"
          />
          <NotificationToggle
            icon={PoundSterling}
            title={t("specialOffers") || "Special Offers"}
            description={t("limitedTimeDeals") || "Limited-time deals and exclusive offers"}
            checked={prefs.special_offers}
            onToggle={() => handleToggle('special_offers')}
            color="emerald"
          />
        </CardContent>
      </Card>

      {/* Partnership Program */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="w-5 h-5" />
            {t("partnershipProgram") || "Partnership Program"}
          </CardTitle>
          <CardDescription>
            {t("cashbackReferrals") || "Cashback and referral notifications"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <NotificationToggle
            icon={PoundSterling}
            title={t("cashbackUpdates") || "Cashback Updates"}
            description={t("earnedCashback") || "When you earn cashback from orders"}
            checked={prefs.cashback_updates}
            onToggle={() => handleToggle('cashback_updates')}
            color="green"
          />
          <NotificationToggle
            icon={Trophy}
            title={t("referralUpdates") || "Referral Updates"}
            description={t("referralActivity") || "Activity from your referral network"}
            checked={prefs.referral_updates}
            onToggle={() => handleToggle('referral_updates')}
            color="blue"
          />
          <NotificationToggle
            icon={PoundSterling}
            title={t("payoutApprovals") || "Payout Approvals"}
            description={t("withdrawalStatus") || "When your withdrawal is processed"}
            checked={prefs.payout_approvals}
            onToggle={() => handleToggle('payout_approvals')}
            color="purple"
          />
          <NotificationToggle
            icon={Trophy}
            title={t("tierUpdates") || "Tier Updates"}
            description={t("levelUpgrades") || "When you reach a new tier level"}
            checked={prefs.tier_updates}
            onToggle={() => handleToggle('tier_updates')}
            color="amber"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationToggle({ icon: Icon, title, description, checked, onToggle, color }) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    pink: "bg-pink-100 text-pink-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600"
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
      <div className="flex items-center gap-3 flex-1">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="font-medium text-slate-900 text-sm">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );
}