import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Volume2, VolumeX, Save, Play } from "lucide-react";
import { toast } from "sonner";

export default function KDSSettings() {
  const [localSettings, setLocalSettings] = useState(null);
  const queryClient = useQueryClient();
  const newOrderAudioRef = useRef(null);
  const overdueAudioRef = useRef(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["kdsSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "kds_settings" });
      return result[0] || {
        setting_key: "kds_settings",
        kds_sound_enabled: true,
        kds_alert_volume: 0.8,
        kds_new_order_sound_url: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
        kds_overdue_sound_url: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
      };
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.SystemSettings.update(settings.id, data);
      } else {
        return base44.entities.SystemSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kdsSettings"] });
      setLocalSettings(null);
      toast.success("KDS settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save KDS settings");
    }
  });

  const handleSave = async () => {
    if (!localSettings) return;
    await updateSettingsMutation.mutateAsync(localSettings);
  };

  const handleToggleSound = () => {
    const newValue = !currentSettings?.kds_sound_enabled;
    setLocalSettings({
      ...currentSettings,
      kds_sound_enabled: newValue
    });
  };

  const playTestSound = (type) => {
    const audioRef = type === 'new' ? newOrderAudioRef : overdueAudioRef;
    if (audioRef.current) {
      audioRef.current.volume = currentSettings?.kds_alert_volume || 0.8;
      audioRef.current.play().catch(() => {});
    }
  };

  const currentSettings = localSettings || settings;

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Hidden audio elements */}
      <audio ref={newOrderAudioRef} src={currentSettings?.kds_new_order_sound_url} preload="auto" />
      <audio ref={overdueAudioRef} src={currentSettings?.kds_overdue_sound_url} preload="auto" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Kitchen Display System (KDS) Audio Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Sound Enabled Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-3">
                {currentSettings?.kds_sound_enabled ? (
                  <Volume2 className="w-5 h-5 text-green-600" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <p className="font-medium text-slate-900">Audio Alerts</p>
                  <p className="text-sm text-slate-500">Enable or disable sound notifications for new orders and alerts</p>
                </div>
              </div>
              <button
                onClick={handleToggleSound}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  currentSettings?.kds_sound_enabled ? 'bg-green-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    currentSettings?.kds_sound_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-slate-500 px-4">
              {currentSettings?.kds_sound_enabled
                ? "Sound is ON - Staff will hear alerts for new orders and overdue items"
                : "Sound is OFF - No audio notifications will play"}
            </p>
          </div>

          {/* Volume Control */}
          {currentSettings?.kds_sound_enabled && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Alert Volume</p>
                  <p className="text-sm text-slate-600">Control the loudness of audio alerts</p>
                </div>
                <Badge variant="outline" className="text-lg font-semibold">
                  {Math.round((currentSettings?.kds_alert_volume || 0.8) * 100)}%
                </Badge>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round((currentSettings?.kds_alert_volume || 0.8) * 100)}
                onChange={(e) => setLocalSettings({
                  ...currentSettings,
                  kds_alert_volume: parseInt(e.target.value) / 100
                })}
                className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-slate-500">
                Adjust the volume level for new order notifications and delay alerts
              </p>
            </div>
          )}

          {/* Sound Selection for Alert Types */}
          {currentSettings?.kds_sound_enabled && (
            <div className="space-y-4">
              {/* New Order Sound */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-green-600">New Order Alert</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => playTestSound('new')}
                    className="ml-auto gap-1"
                  >
                    <Play className="w-3 h-3" />
                    Test Sound
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-700">Sound URL</Label>
                  <Input
                    value={currentSettings?.kds_new_order_sound_url || ""}
                    onChange={(e) => setLocalSettings({
                      ...currentSettings,
                      kds_new_order_sound_url: e.target.value
                    })}
                    placeholder="Enter sound URL..."
                    className="text-sm"
                  />
                  <p className="text-xs text-slate-500">Single beep when new order arrives</p>
                </div>
              </div>

              {/* Overdue Sound */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-red-600">Overdue Alert</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => playTestSound('overdue')}
                    className="ml-auto gap-1"
                  >
                    <Play className="w-3 h-3" />
                    Test Sound
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-700">Sound URL</Label>
                  <Input
                    value={currentSettings?.kds_overdue_sound_url || ""}
                    onChange={(e) => setLocalSettings({
                      ...currentSettings,
                      kds_overdue_sound_url: e.target.value
                    })}
                    placeholder="Enter sound URL..."
                    className="text-sm"
                  />
                  <p className="text-xs text-slate-500">Triple beep for orders over 10 minutes</p>
                </div>
              </div>

              {/* Suggested Sounds */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-2">Suggested Sound URLs:</p>
                <div className="space-y-1 text-xs text-blue-700">
                  <p>• Digital Alarm: https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg</p>
                  <p>• Short Beep: https://actions.google.com/sounds/v1/alarms/beep_short.ogg</p>
                  <p>• Bell Chime: https://actions.google.com/sounds/v1/alarms/medium_bell.ogg</p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {localSettings && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setLocalSettings(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateSettingsMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}