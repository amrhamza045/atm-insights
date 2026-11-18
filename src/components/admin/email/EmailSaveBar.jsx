import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmailSaveBar({ count, saving, onSave, onDiscard }) {
  return (
    <div className="sticky bottom-20 z-20 md:bottom-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
        <p className="text-sm font-medium text-amber-900">{count} unsaved change{count === 1 ? "" : "s"}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={saving} onClick={onDiscard}>Discard</Button>
          <Button size="sm" disabled={saving} onClick={onSave} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="animate-spin" /> : <Save />}Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}