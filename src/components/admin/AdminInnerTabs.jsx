import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";

/** Inner tabs of an Admin section. Tabs closed in Admin › Modules are left out. */
export default function AdminInnerTabs({ screen, tabs }) {
  const open = useScreenTabs(screen).keep(tabs);
  const [requested, setRequested] = useState(null);
  const value = (open.find((t) => t.key === requested) || open[0])?.key;

  if (!value) return <ClosedTabsNotice />;

  return (
    <Tabs value={value} onValueChange={setRequested} className="w-full">
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${open.length}, minmax(0, 1fr))` }}>
        {open.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
      </TabsList>
      {open.map((t) => (
        <TabsContent key={t.key} value={t.key} className="mt-4">{t.content}</TabsContent>
      ))}
    </Tabs>
  );
}