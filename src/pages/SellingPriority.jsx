import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ChefHat } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import SteeringItemRow from "@/components/steering/SteeringItemRow";

export default function SellingPriority() {
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState(null);
  const { selectedBranchId } = useBranch();
  const { permissions } = usePermissions();
  const queryClient = useQueryClient();

  // Settings tabs steer every station; "Set selling priority" steers the person's own display.
  const isManager = !!permissions?.admin_settings;
  const canSteer = !!permissions?.selling_priority_manage;
  const isHeadKitchen = !isManager && canSteer && !!permissions?.kds_view && !permissions?.kds_bar_view;
  const isHeadBar = !isManager && canSteer && !!permissions?.kds_bar_view && !permissions?.kds_view;
  const canAccess = isManager || canSteer;

  const { data: allMenuItems = [] } = useQuery({ queryKey: ["menuItems"], queryFn: () => base44.entities.MenuItem.list("-created_date") });
  const { data: areas = [] } = useQuery({ queryKey: ["preparationAreas"], queryFn: () => base44.entities.PreparationArea.list() });

  // Head chef manages kitchen items, head barista manages bar items, managers can switch
  const ownStation = isHeadKitchen ? "kitchen" : isHeadBar ? "bar" : null;
  const activeStation = ownStation || stationFilter;

  const items = useMemo(() => {
    return allMenuItems
      .filter(i => !selectedBranchId || !i.branch_id || i.branch_id === selectedBranchId)
      .filter(i => i.visible_pos !== false && i.available !== false)
      .filter(i => !activeStation || (i.preparation_station || "kitchen") === activeStation)
      .filter(i => !search || i.name?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [allMenuItems, selectedBranchId, activeStation, search]);

  const pushCount = items.filter(i => i.sell_priority === "push").length;
  const slowCount = items.filter(i => i.sell_priority === "slow").length;

  // Saved on the server, which re-checks the permission and the station.
  const save = async (item, data) => {
    await base44.functions.invoke("setSellingPriority", { menu_item_id: item.id, ...data });
    queryClient.invalidateQueries({ queryKey: ["menuItems"] });
  };

  const handleSet = async (item, priority) => {
    await save(item, { sell_priority: priority });
    toast.success(
      priority === "push" ? `${item.name} marked to push` :
      priority === "slow" ? `${item.name} marked to slow down` :
      `${item.name} set back to normal`
    );
  };

  const handleNote = async (item, note) => {
    await save(item, { steering_note: note });
    toast.success("Note saved");
  };

  if (!canAccess) {
    return <div className="p-10 text-center text-slate-500">You need the "Set selling priority" permission to change selling priorities.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <ChefHat className="w-7 h-7 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold">Selling Priorities</h1>
            <p className="text-sm text-slate-500">Tell the floor what to push and what to slow down. Captains see it instantly.</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex flex-wrap items-center gap-3">
              <span>{items.length} items</span>
              <span className="text-emerald-700 text-sm font-medium">{pushCount} pushing</span>
              <span className="text-rose-700 text-sm font-medium">{slowCount} slowing down</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isManager && !ownStation && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={!stationFilter ? "default" : "outline"} onClick={() => setStationFilter(null)}>All stations</Button>
                {areas.map(a => (
                  <Button
                    key={a.id}
                    size="sm"
                    variant={stationFilter === a.key ? "default" : "outline"}
                    onClick={() => setStationFilter(a.key)}
                  >
                    {a.name || a.key}
                  </Button>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>

            <div className="space-y-2">
              {items.map(item => (
                <SteeringItemRow key={item.id} item={item} onSet={handleSet} onNote={handleNote} />
              ))}
              {items.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-8">No items match.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}