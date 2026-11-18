import React from "react";
import { TabsTrigger } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";

/** A tab trigger that disappears when its tab is closed in Admin › Modules. */
export default function OpenTabTrigger({ screen, value, ...props }) {
  const { isOpen } = useScreenTabs(screen);
  return isOpen(value) ? <TabsTrigger value={value} {...props} /> : null;
}