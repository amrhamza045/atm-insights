import React, { Suspense } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export default function QuickEditDialog({ item, onClose }) {
  const Editor = item?.editor;
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{item?.title}</DialogTitle>
          {item?.impact && (
            <p className="text-xs text-muted-foreground pt-1">
              <span className="font-medium text-foreground">{item.scopeLabel}:</span> {item.impact}
            </p>
          )}
        </DialogHeader>
        {Editor && (
          <Suspense fallback={<div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
            <Editor />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
}