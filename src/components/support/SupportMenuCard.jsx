import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import SupportPriceInput from "./SupportPriceInput";

export default function SupportMenuCard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["support-menu", search],
    queryFn: async () => (await base44.entities.MenuItem.filter(
      search ? { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } } : {},
      { sort: "name", limit: 50 }
    )).items,
  });

  const update = async (m, patch) => {
    try {
      await base44.entities.MenuItem.update(m.id, patch);
      qc.invalidateQueries({ queryKey: ["support-menu"] });
      toast.success(`${m.name} updated`);
    } catch (e) { toast.error(e.message || "Could not save"); }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="font-heading">Menu items</CardTitle>
        <Input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </CardHeader>
      <CardContent className="divide-y max-h-[480px] overflow-y-auto">
        {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No items found.</p>}
        {data?.map((m) => (
          <div key={m.id} className="flex items-center gap-3 py-3">
            {m.image_url && <img src={m.image_url} alt="" className="w-10 h-10 rounded object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{m.name}</p>
              <p className="text-xs text-muted-foreground truncate">{m.category}</p>
            </div>
            <SupportPriceInput value={m.price} onSave={(v) => update(m, { price: v })} />
            <Switch checked={m.available !== false} onCheckedChange={(v) => update(m, { available: v })} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}