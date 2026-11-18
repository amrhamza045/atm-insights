import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Save } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function LowStockSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    enable_low_stock_alerts: true,
    send_low_stock_emails: false,
    send_low_stock_sms: false
  });

  const { data: systemSettings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const settings = await base44.entities.SystemSettings.list();
      return settings[0] || null;
    }
  });

  useEffect(() => {
    if (systemSettings) {
      setSettings({
        enable_low_stock_alerts: systemSettings.enable_low_stock_alerts ?? true,
        send_low_stock_emails: systemSettings.send_low_stock_emails ?? false,
        send_low_stock_sms: systemSettings.send_low_stock_sms ?? false
      });
    }
  }, [systemSettings]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (systemSettings?.id) {
        return await base44.entities.SystemSettings.update(systemSettings.id, data);
      } else {
        return await base44.entities.SystemSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
      toast.success("Low stock alert settings updated");
    }
  });

  const handleSave = () => {
    updateMutation.mutate(settings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Low Stock Alert Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-600" />
              <div>
                <Label className="font-semibold">Enable Low Stock Alerts</Label>
                <p className="text-sm text-slate-500">
                  Automatically notify when items fall below threshold
                </p>
              </div>
            </div>
            <Switch
              checked={settings.enable_low_stock_alerts}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enable_low_stock_alerts: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-600" />
              <div>
                <Label className="font-semibold">Email Notifications</Label>
                <p className="text-sm text-slate-500">
                  Send email alerts to all admin users
                </p>
              </div>
            </div>
            <Switch
              checked={settings.send_low_stock_emails}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, send_low_stock_emails: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-slate-600" />
              <div>
                <Label className="font-semibold">SMS Notifications</Label>
                <p className="text-sm text-slate-500">
                  Send SMS alerts to admin phone numbers
                </p>
              </div>
            </div>
            <Switch
              checked={settings.send_low_stock_sms}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, send_low_stock_sms: checked })
              }
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}