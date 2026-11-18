import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import { toast } from "sonner";

export default function TimezoneSettings() {
  const [tzOffset, setTzOffset] = useState(""); // Offset in minutes; empty until an admin sets it
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["timezoneSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "timezone_settings" });
      return result[0] || null;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newFields) => {
      // Deep merge: spread existing settings so we don't drop any keys
      const mergedData = {
        ...settings,
        ...newFields
      };
      // Remove internal fields that shouldn't be written back
      delete mergedData.id;
      delete mergedData.created_date;
      delete mergedData.updated_date;
      delete mergedData.created_by;
      delete mergedData.created_by_id;

      if (settings?.id) {
        return base44.entities.SystemSettings.update(settings.id, mergedData);
      } else {
        return base44.entities.SystemSettings.create(mergedData);
      }
    },
    onSuccess: () => {
      // Invalidate so TimezoneLoader picks up the new value and writes to localStorage
      queryClient.invalidateQueries({ queryKey: ["timezoneSettings"] });
      toast.success("Timezone updated successfully");
    }
  });

  useEffect(() => {
    if (settings?.timezone_offset_minutes != null) {
      setTzOffset(String(settings.timezone_offset_minutes));
    }
  }, [settings]);

  const handleSave = () => {
    const offset = parseInt(tzOffset);
    if (isNaN(offset) || offset < -840 || offset > 840) {
      toast.error("Timezone offset must be between -14:00 and +14:00");
      return;
    }

    updateSettingsMutation.mutate({
      setting_key: "timezone_settings",
      timezone_offset_minutes: offset
    });
  };

  const commonTimezones = [
    { name: "UTC-12:00 (Baker Island)", offset: "-720" },
    { name: "UTC-08:00 (PST)", offset: "-480" },
    { name: "UTC-05:00 (EST)", offset: "-300" },
    { name: "UTC+00:00 (GMT)", offset: "0" },
    { name: "UTC+01:00 (CET)", offset: "60" },
    { name: "UTC+02:00 (EET/Cairo)", offset: "120" },
    { name: "UTC+03:00 (MSK)", offset: "180" },
    { name: "UTC+05:30 (IST)", offset: "330" },
    { name: "UTC+08:00 (SGT)", offset: "480" },
    { name: "UTC+09:00 (JST)", offset: "540" },
    { name: "UTC+12:00 (NZST)", offset: "720" }
  ];

  const formatOffsetDisplay = (minutes) => {
    if (isNaN(minutes)) return "Not set";
    const sign = minutes >= 0 ? "+" : "-";
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return `UTC${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          System Timezone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings?.timezone_offset_minutes == null && (
          <p className="text-sm p-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
            No company timezone is set. Times show in UTC and the compliance reports and catering cost runs will ask for it until you save one.
          </p>
        )}
        <div>
          <Label className="text-sm font-medium mb-2 block">Select Timezone</Label>
          <Select value={tzOffset} onValueChange={setTzOffset}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {commonTimezones.map((tz) => (
                <SelectItem key={tz.offset} value={tz.offset}>
                  {tz.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">
            Or Enter Custom Offset (minutes from UTC)
          </Label>
          <Input
            type="number"
            value={tzOffset}
            onChange={(e) => setTzOffset(e.target.value)}
            placeholder="e.g., 120 for UTC+2"
            min="-840"
            max="840"
          />
          <p className="text-xs text-slate-500 mt-1">
            Current: {formatOffsetDisplay(parseInt(tzOffset))}
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="w-full"
        >
          {updateSettingsMutation.isPending ? "Saving..." : "Update Timezone"}
        </Button>

        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> This timezone will be applied to all timestamps throughout the application, 
            regardless of browser or device settings. All users will see times in this timezone.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}