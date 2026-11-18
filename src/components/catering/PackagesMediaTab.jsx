import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useOpenTab from "@/hooks/useOpenTab";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import PackagesTab from "./PackagesTab";
import MediaVendorsTab from "./MediaVendorsTab";

export default function PackagesMediaTab({ packageId }) {
  // Both tabs can be closed in Admin › Modules, per role or per user.
  const sub = useOpenTab("CateringPackages", ["packages", "media"]);
  if (!sub.value) return <ClosedTabsNotice />;

  return (
    <Tabs value={sub.value} onValueChange={sub.setValue} className="space-y-4">
      <TabsList>
        {sub.isOpen("packages") && <TabsTrigger value="packages">Packages</TabsTrigger>}
        {sub.isOpen("media") && <TabsTrigger value="media">Photo & Video</TabsTrigger>}
      </TabsList>
      <TabsContent value="packages"><PackagesTab targetPackageId={packageId} /></TabsContent>
      <TabsContent value="media"><MediaVendorsTab /></TabsContent>
    </Tabs>
  );
}