import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";

/**
 * Reusable dialog allowing an authorized user to copy CateringEquipment and/or
 * CateringVehicle records from any branch they have permission to access into the
 * currently selected destination branch.
 */
export default function CopyBranchAssetsDialog({
  open,
  onOpenChange,
  assetTypes = ["equipment"],
  title = "Copy from Another Authorized Branch",
}) {
  const queryClient = useQueryClient();
  const { branches = [], selectedBranch, selectedBranchId } = useBranch();
  const [sourceBranchId, setSourceBranchId] = useState("");
  const [copying, setCopying] = useState(false);

  // Only branches the user is authorized to access (from BranchContext) other than the current destination branch
  const sourceBranches = branches.filter((b) => b.id && b.id !== selectedBranchId);

  useEffect(() => {
    if (!open) return;
    if (sourceBranches.length > 0 && (!sourceBranchId || sourceBranchId === selectedBranchId)) {
      setSourceBranchId(sourceBranches[0].id);
    }
  }, [open, sourceBranches, selectedBranchId, sourceBranchId]);

  const handleCopy = async () => {
    if (!sourceBranchId || !selectedBranchId) {
      return toast.error("Select both source and destination branches");
    }
    setCopying(true);
    try {
      const res = await base44.functions.invoke("branchIsolationManager", {
        action: "copy_assets",
        source_branch_id: sourceBranchId,
        target_branch_id: selectedBranchId,
        asset_types: assetTypes,
      });
      if (res.data?.error) throw new Error(res.data.error);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-equipment"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-equipment-units"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-vehicles"] }),
      ]);

      const parts = [];
      if (assetTypes.includes("equipment")) {
        parts.push(`${res.data.copied_equipment_count || 0} equipment item(s) copied`);
      }
      if (assetTypes.includes("vehicles")) {
        parts.push(`${res.data.copied_vehicles_count || 0} vehicle(s) copied`);
      }
      toast.success(`${parts.join(" & ")} into ${selectedBranch?.name || "selected branch"}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Could not copy branch assets");
    } finally {
      setCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              Only branches granted by your effective branch permissions are listed below. Copied records are created as independent branch-owned records in{" "}
              <strong>{selectedBranch?.name || "the active branch"}</strong>.
            </div>
          </div>

          {sourceBranches.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">
              You do not have access to another branch to copy from, or only one branch is active.
            </p>
          ) : (
            <>
              <div>
                <Label>Source Branch (Authorized)</Label>
                <Select value={sourceBranchId} onValueChange={setSourceBranchId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose source branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Destination Branch</Label>
                <div className="mt-1 px-3 py-2 rounded-md border bg-slate-50 text-sm font-medium text-slate-800">
                  {selectedBranch?.name || "Active branch"}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={copying || sourceBranches.length === 0 || !sourceBranchId}
            className="gap-1.5"
          >
            {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
            {copying ? "Copying…" : "Copy to This Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}