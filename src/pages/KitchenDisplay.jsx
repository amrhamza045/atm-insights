import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat } from "lucide-react";
import CateringKdsPanel from "@/components/kds/CateringKdsPanel";
import HeadChefBoard from "@/components/kds/board/HeadChefBoard";
import { useChefBoardAccess } from "@/components/kds/board/useChefBoardAccess";
import useTabTrail from "@/lib/useTabTrail";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";

export default function KitchenDisplay() {
  const chefAccess = useChefBoardAccess();
  const [cateringCounts, setCateringCounts] = useState({ slips: 0, production: 0, upcoming: 0 });

  const { data: rawAreas = [], isLoading: loadingAreas } = useQuery({
    queryKey: ["kdsPreparationAreas"],
    queryFn: () => base44.entities.PreparationArea.list("sort_order"),
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 15000
  });
  const { isOpen } = useScreenTabs("KitchenDisplay");
  const prepAreas = rawAreas.filter(a => a.is_active !== false);
  // Station tabs closed in Admin › Modules are left out.
  const stationAreas = prepAreas.filter((a) => isOpen(a.key));
  const showChefBoard = prepAreas.some((a) => a.key === "kitchen") && isOpen("chef_board");
  const allClosed = !loadingAreas && prepAreas.length > 0 && stationAreas.length === 0 && !showChefBoard;
  // Station lives in the address; an unknown or closed station falls back to the kitchen (or the first area).
  const [station, setStation] = useTabTrail([
    ...stationAreas.map((a) => ({ key: a.key, label: a.name })),
    ...(showChefBoard ? [{ key: "chef_board", label: "Head Chef Production Board" }] : []),
  ], { param: "station", fallback: "kitchen" });

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Kitchen Display System</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Upcoming Events</p>
              <p className="text-2xl font-bold text-primary">{cateringCounts.upcoming || 0}</p>
            </div>
            {station === "kitchen" && chefAccess.canEdit && (
              <>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Batches to Release</p>
                  <p className="text-2xl font-bold text-primary">{cateringCounts.slips}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Unfinished Production</p>
                  <p className="text-2xl font-bold text-primary">{cateringCounts.production}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {allClosed ? <ClosedTabsNotice /> : (<>
        {/* Station Tabs */}
        <Tabs value={station} onValueChange={setStation} className="mb-6">
          <TabsList className="bg-card flex-wrap h-auto">
            {stationAreas.map(area => (
              <TabsTrigger
                key={area.key}
                value={area.key}
                className="gap-2"
                style={station === area.key ? { backgroundColor: area.color || "hsl(var(--primary))", color: area.color ? "#fff" : "hsl(var(--primary-foreground))" } : {}}
              >
                {area.name}
              </TabsTrigger>
            ))}
            {showChefBoard && (
              <TabsTrigger value="chef_board" className="gap-2"><ChefHat className="w-4 h-4" />Head Chef Production Board</TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {station !== "chef_board" && (chefAccess.canEdit
          ? <CateringKdsPanel onCounts={setCateringCounts} />
          : !chefAccess.loading && <p className="text-center text-muted-foreground py-10">Your assigned catering items are on the Head Chef Production Board tab.</p>)}
        {station === "chef_board" && showChefBoard && <HeadChefBoard />}
        </>)}
      </div>
    </div>
  );
}