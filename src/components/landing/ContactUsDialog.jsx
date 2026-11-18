import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PackageRequestPanel from "@/components/packages/PackageRequestPanel";

export default function ContactUsDialog({ open, onOpenChange, selected = [], onRemove, onSubmitted }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:p-10 bg-[hsl(var(--landing-ivory))]">
        <PackageRequestPanel
          bare
          selected={selected}
          onRemove={onRemove}
          onBrowse={() => onOpenChange(false)}
          onSubmitted={() => { onSubmitted?.(); onOpenChange(false); }}
        />
      </DialogContent>
    </Dialog>
  );
}