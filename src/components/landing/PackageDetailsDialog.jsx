import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import PackageDetailsContent from "./PackageDetailsContent";

// selectedItem = the package as currently in the visitor's request (carries chosen_extras).
export default function PackageDetailsDialog({ pkg, selectedItem, onToggle, onSetExtras, onClose }) {
  const [chosen, setChosen] = useState([]);

  useEffect(() => {
    setChosen((selectedItem?.chosen_extras || []).map((x) => x.name));
  }, [pkg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toExtras = (names) => (pkg.extra_items || []).filter((x) => names.includes(x.name));

  const changeExtras = (names) => {
    setChosen(names);
    if (selectedItem) onSetExtras(pkg.id, toExtras(names));
  };

  return (
    <Dialog open={!!pkg} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto md:overflow-hidden rounded-3xl border-0 gap-0 [&>button]:z-10 [&>button]:bg-white/90 [&>button]:rounded-full [&>button]:p-1.5">
        {pkg && (
          <PackageDetailsContent
            pkg={pkg}
            selected={!!selectedItem}
            onToggle={() => onToggle(pkg, toExtras(chosen))}
            chosenExtras={chosen}
            onExtrasChange={changeExtras}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}