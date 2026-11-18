import React from "react";
import { Badge } from "@/components/ui/badge";
import { CircleDashed, FileClock, Truck, PackageCheck } from "lucide-react";

const STYLES = {
  none: { cls: "bg-slate-100 text-slate-600 border-slate-200", Icon: CircleDashed },
  draft: { cls: "bg-warning-100 text-warning-700 border-warning-200", Icon: FileClock },
  ordered: { cls: "bg-blue-100 text-blue-700 border-blue-200", Icon: Truck },
  purchased: { cls: "bg-green-100 text-green-700 border-green-200", Icon: PackageCheck },
};

export default function EventCartFlag({ status }) {
  if (!status) return null;
  const { cls, Icon } = STYLES[status.key] || STYLES.none;
  return (
    <Badge className={`${cls} text-xs shrink-0 gap-1 font-medium`} title={`${status.count} purchase order(s)`}>
      <Icon className="w-3 h-3" />
      {status.label}
    </Badge>
  );
}