import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

// Quotes read their package again when they're edited and when the event's
// equipment and materials are planned, so a package still on a quote can only be retired.
export default function DeletePackageButton({ pkg }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [quotes, setQuotes] = useState(null); // live quotes using this package
  const [deleting, setDeleting] = useState(false);

  const start = async () => {
    setQuotes(null);
    setOpen(true);
    const n = await base44.entities.CateringQuote.count({ package_id: pkg.id }).catch(() => null);
    if (n !== null) return setQuotes(n);
    setOpen(false);
    toast.error("Couldn't check which quotes use this package");
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await base44.entities.CateringPackage.delete(pkg.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-packages"] }),
        queryClient.invalidateQueries({ queryKey: ["cateringPackages", "public"] }),
      ]);
      toast.success(`${pkg.name} deleted`);
      setOpen(false);
    } catch (e) {
      toast.error(e?.message || "Couldn't delete the package");
    }
    setDeleting(false);
  };

  const inUse = quotes > 0;
  const message = quotes === null
    ? "Checking quotes…"
    : inUse
    ? `It's on ${quotes} quote${quotes === 1 ? "" : "s"} that still rely on it. Retire it with the archive button instead.`
    : "This permanently removes the package from your catalogue and the landing page.";

  return (
    <>
      <Button variant="ghost" size="icon" title="Delete package" aria-label="Delete package" onClick={start} className="text-danger-600 hover:text-danger-700 hover:bg-danger-50">
        <Trash2 className="w-4 h-4" />
      </Button>
      <AlertDialog open={open} onOpenChange={(v) => !deleting && setOpen(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{inUse ? `${pkg.name} can't be deleted` : `Delete ${pkg.name}?`}</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{inUse ? "Close" : "Cancel"}</AlertDialogCancel>
            {quotes === 0 && (
              <Button variant="destructive" onClick={remove} disabled={deleting} className="gap-1.5">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Delete
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}