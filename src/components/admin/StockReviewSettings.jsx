import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function StockReviewSettings() {
  const [freezeEnabled, setFreezeEnabled] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [isActive, setIsActive] = useState(false);

  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["stockReviewSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ 
        setting_key: "stock_review_settings" 
      });
      return result[0];
    }
  });

  useEffect(() => {
    if (settings) {
      setFreezeEnabled(settings.stock_review_freeze_enabled || false);
      setStartTime(settings.stock_review_freeze_start || "");
      setEndTime(settings.stock_review_freeze_end || "");
      setReason(settings.stock_review_freeze_reason || "");
      
      // Check if freeze is currently active
      if (settings.stock_review_freeze_enabled && settings.stock_review_freeze_start && settings.stock_review_freeze_end) {
        const now = new Date();
        const start = new Date(settings.stock_review_freeze_start);
        const end = new Date(settings.stock_review_freeze_end);
        setIsActive(now >= start && now <= end);
      }
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.SystemSettings.update(settings.id, data);
      } else {
        return base44.entities.SystemSettings.create({
          setting_key: "stock_review_settings",
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stockReviewSettings"] });
      toast.success("Stock review settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    }
  });

  const handleSave = () => {
    if (freezeEnabled && (!startTime || !endTime)) {
      toast.error("Please set both start and end times");
      return;
    }

    saveMutation.mutate({
      stock_review_freeze_enabled: freezeEnabled,
      stock_review_freeze_start: startTime,
      stock_review_freeze_end: endTime,
      stock_review_freeze_reason: reason
    });
  };

  const timeUntilStart = startTime ? new Date(startTime) - new Date() : null;
  const timeUntilEnd = endTime ? new Date(endTime) - new Date() : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Stock Review Freeze
            </span>
            {isActive && (
              <Badge className="bg-red-500 animate-pulse">ACTIVE NOW</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isActive && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-semibold mb-1">Stock Review Freeze Active</p>
                <p>All sales are currently frozen. Resume sales by disabling the freeze or waiting for the end time.</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={freezeEnabled}
                  onChange={(e) => setFreezeEnabled(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>Enable Stock Review Freeze</span>
              </Label>
              <p className="text-xs text-slate-500">When enabled, all POS sales will be disabled during the specified period</p>
            </div>

            {freezeEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                    {timeUntilStart && timeUntilStart > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Starts in {Math.ceil(timeUntilStart / (1000 * 60))} minutes
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>End Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                    {timeUntilEnd && timeUntilEnd > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Ends in {Math.ceil(timeUntilEnd / (1000 * 60))} minutes
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Freeze Reason (shown to users)</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., 'Inventory count in progress. Sales will resume at 2:00 PM'"
                    rows={3}
                  />
                </div>
              </>
            )}

            <Button 
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full bg-slate-900 hover:bg-slate-800"
            >
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {freezeEnabled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-amber-900">Freeze Details:</p>
              <div className="text-amber-800">
                {startTime && <p>• Start: {new Date(startTime).toLocaleString()}</p>}
                {endTime && <p>• End: {new Date(endTime).toLocaleString()}</p>}
                {reason && <p>• Reason: {reason}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}