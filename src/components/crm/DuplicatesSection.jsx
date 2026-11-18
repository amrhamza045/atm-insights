import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import DuplicatesPanel from "./DuplicatesPanel";

// Duplicate checks sit with the client list and open on demand, because they read every client.
export default function DuplicatesSection({ canMerge }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-1 font-semibold text-slate-900"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Possible duplicates
          </Button>
          {open && (
            <p className="text-sm text-slate-500">
              Likely duplicate client records. Nothing is merged automatically: someone confirms every merge, and the
              duplicate is archived rather than deleted.
            </p>
          )}
        </CardContent>
      </Card>
      {open && <DuplicatesPanel canMerge={canMerge} />}
    </div>
  );
}