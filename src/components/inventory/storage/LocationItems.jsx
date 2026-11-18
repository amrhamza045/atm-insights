import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";

export default function LocationItems({ branchId, locationId, isMain, categories }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const query = { branch_id: branchId };
  // Items with no location belong to Main Storage.
  if (isMain) query.$or = [{ storage_location_id: locationId }, { storage_location_id: { $exists: false } }, { storage_location_id: "" }];
  else if (!locationId) query.$or = [{ storage_location_id: { $exists: false } }, { storage_location_id: "" }];
  else query.storage_location_id = locationId;
  if (categoryId) query.category_id = categoryId;
  if (search.trim()) query.name = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const { data, isLoading } = useQuery({
    queryKey: ["storageItems", query],
    queryFn: () => base44.entities.InventoryItem.filter(query, { sort: "name", limit: 200 }),
    enabled: !!locationId,
  });
  const items = data?.items || [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="pl-9" />
        </div>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-10">No items in this location.</p>
      ) : (
        <div className="divide-y border rounded-lg">
          {items.map((i) => {
            const low = (i.quantity || 0) <= (i.low_stock_threshold ?? 10);
            return (
              <div key={i.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{i.name}</p>
                  <p className="text-xs text-slate-500">{i.category_name || "Uncategorized"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {low && <Badge className="bg-red-100 text-red-700">Low</Badge>}
                  <span className="font-semibold">{i.quantity || 0} {i.selling_unit_label || i.unit || ""}</span>
                </div>
              </div>
            );
          })}
          {data?.has_more && <p className="text-xs text-slate-500 p-2 text-center">Showing first 200 — refine the search to see more.</p>}
        </div>
      )}
    </div>
  );
}