import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

/** Asks which language the document should be produced in before printing or
 *  downloading. `action` is "print" or "download" — used only for the wording. */
export default function DocumentLanguageDialog({ open, onOpenChange, action, onSelect }) {
  const verb = action === "print" ? "print" : action === "whatsapp" ? "send" : "download";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="w-4 h-4" /> Choose language
          </DialogTitle>
          <DialogDescription>Which language should we {verb} this document in?</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button variant="outline" className="h-16 flex-col gap-0.5" onClick={() => onSelect("en")}>
            <span className="font-semibold">English</span>
            <span className="text-xs text-slate-500">Left-to-right</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-0.5" onClick={() => onSelect("ar")}>
            <span className="font-semibold">العربية</span>
            <span className="text-xs text-slate-500">Right-to-left</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}