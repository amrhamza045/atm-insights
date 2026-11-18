import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import SupportPriceInput from "./SupportPriceInput";

export default function SupportPackagesCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["support-packages"],
    queryFn: async () => (await base44.entities.CateringPackage.filter({}, { sort: "name", limit: 50 })).items,
  });

  const update = async (p, patch) => {
    try {
      await base44.entities.CateringPackage.update(p.id, patch);
      qc.invalidateQueries({ queryKey: ["support-packages"] });
      toast.success(`${p.name} updated`);
    } catch (e) { toast.error(e.message || "Could not save"); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="font-heading">Packages</CardTitle></CardHeader>
      <CardContent className="divide-y">
        {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No packages yet.</p>}
        {data?.map((p) => {
          const field = p.pricing_mode === "flat" ? "flat_price" : "base_price_per_guest";
          return (
            <div key={p.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.pricing_mode === "itemized" ? "Itemized, edit in Catering" : field === "flat_price" ? "Flat price" : "Per person"}</p>
              </div>
              {p.pricing_mode !== "itemized" && <SupportPriceInput value={p[field]} onSave={(v) => update(p, { [field]: v })} />}
              <Switch checked={p.is_active !== false} onCheckedChange={(v) => update(p, { is_active: v })} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}