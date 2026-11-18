import React from "react";
import { Card } from "@/components/ui/card";
import { MousePointerClick } from "lucide-react";

export default function EventScopeNotice() {
  return (
    <Card className="p-8 text-center">
      <MousePointerClick className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="text-slate-600 font-medium">Select an event first</p>
      <p className="text-sm text-slate-500">Open the Events tab and click an event — the other tabs scope to it automatically.</p>
    </Card>
  );
}