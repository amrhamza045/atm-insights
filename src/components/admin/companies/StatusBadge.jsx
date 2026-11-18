import React from "react";
import { Badge } from "@/components/ui/badge";

export default function StatusBadge({ active }) {
  return (
    <Badge className={active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}