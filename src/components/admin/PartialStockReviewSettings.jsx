import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function PartialStockReviewSettings() {
  const [freezeType, setFreezeType] = useState("full");
  const [freezeEnabled, setFreezeEnabled] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isActive, setIsActive] = useState(false);

  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["stockReviewSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "stock_review_settings" });
      return result[0];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.filter({ is_active: true })
  });

  useEffect(() => {
    if (settings) {
      setFreezeEnabled(settings.stock_review_freeze_enabled || false);
      setFreezeType(settings.stock_review_freeze_type || "full");
      setStartTime(settings.stock_review_freeze_start || "");
      setEndTime(settings.stock_review_freeze_end || "");
      setReason(settings.stock_review_freeze_reason || "");
      setSelectedCategories(settings.stock_review_frozen_categories || []);

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
    }
  });

  const handleSave = () => {
    if (freezeEnabled && (!startTime || !endTime)) {
      toast.error("Please set both start and end times");
      return;
    }
    if (freezeEnabled && freezeType === "partial" && selectedCategories.length === 0) {
      toast.error("Please select at least one category for partial freeze");
      return;
    }

    saveMutation.mutate({
      stock_review_freeze_enabled: freezeEnabled,
      stock_review_freeze_type: freezeType,
      stock_review_freeze_start: startTime,
      stock_review_freeze_end: endTime,
      stock_review_freeze_reason: reason,
      stock_review_frozen_categories: freezeType === "partial" ? selectedCategories : []
    });
  };

  const frozenCategoryNames = categories
    .filter(c => selectedCategories.includes(c.id))
    .map(c => c.name);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Stock Review Freeze
            </span>
            {isActive && <Badge className="bg-red-500 animate-pulse">ACTIVE</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isActive && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-semibold mb-1">Stock Review Active</p>
                <p>Sales are frozen {freezeType === "full" ? "completely" : `for: ${frozenCategoryNames.join(", ")}`}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <input type="checkbox" checked={freezeEnabled} onChange={(e) => setFreezeEnabled(e.target.checked)} className="w-4 h-4" />
                <span>Enable Stock Review Freeze</span>
              </Label>
            </div>

            {freezeEnabled && (
              <>
                <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                  <Label className="text-sm font-semibold">Freeze Type</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={freezeType === "full"} onChange={() => setFreezeType("full")} />
                      <span className="text-sm">Full Freeze - All items</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={freezeType === "partial"} onChange={() => setFreezeType("partial")} />
                      <span className="text-sm">Partial Freeze - Specific categories only</span>
                    </label>
                  </div>
                </div>

                {freezeType === "partial" && (
                  <div className="space-y-2">
                    <Label>Select Categories to Freeze</Label>
                    <div className="space-y-2 p-3 bg-slate-50 rounded-lg max-h-48 overflow-y-auto">
                      {categories.map(cat => (
                        <label key={cat.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedCategories.includes(cat.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCategories([...selectedCategories, cat.id]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(id => id !== cat.id));
                              }
                            }}
                          />
                          <div className={`w-4 h-4 rounded ${cat.color}`}></div>
                          <span className="text-sm">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date & Time</Label>
                    <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label>End Date & Time</Label>
                    <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Label>Reason (shown to users)</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Inventory count in progress" rows={2} />
                </div>
              </>
            )}

            <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full bg-slate-900">
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}