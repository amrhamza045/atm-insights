import React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";

export default function ApprovalsCenterNotice({ what = "These requests" }) {
  return (
    <Card className="p-4 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50">
      <div className="flex items-center gap-2 text-sm text-amber-900">
        <ClipboardCheck className="w-4 h-4" />
        {what} are reviewed in the Approvals Center.
      </div>
      <Button asChild size="sm" variant="outline"><Link to="/Approvals">Open Approvals Center</Link></Button>
    </Card>
  );
}