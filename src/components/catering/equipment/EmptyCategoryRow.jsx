import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

/** An added category that no item uses yet. It can be removed while nothing uses it. */
export default function EmptyCategoryRow({ category, canDelete }) {
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState(false);

  const remove = async () => {
    setRemoving(true);
    try {
      await base44.entities.CateringEquipmentCategory.delete(category.id);
      await queryClient.invalidateQueries({ queryKey: ["catering-equipment-categories"] });
      toast.success(`Category "${category.name}" removed`);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 border-b pb-1">
      <div className="flex items-start gap-1.5 min-w-0">
        <span className="w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-800">{category.name}</h4>
          <p className="text-xs text-slate-400">No items yet. Pick this category on an item, then save, to move it here.</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-slate-400">0 items</span>
        {canDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className="p-1 rounded hover:bg-red-50 disabled:opacity-50"
            aria-label={`Remove category ${category.name}`}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}