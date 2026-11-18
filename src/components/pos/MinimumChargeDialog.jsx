import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Users, Coins } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function MinimumChargeDialog({ open, onClose, table }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [perGuest, setPerGuest] = useState("");
  const [guests, setGuests] = useState("");

  useEffect(() => {
    if (table) {
      setEnabled(table.minimum_charge_enabled || false);
      setPerGuest(table.minimum_charge_per_guest ? String(table.minimum_charge_per_guest) : "");
      setGuests(table.minimum_charge_guests ? String(table.minimum_charge_guests) : "");
    }
  }, [table]);

  const updateTableMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Table.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    }
  });

  const perGuestNum = parseFloat(perGuest) || 0;
  const guestsNum = parseInt(guests) || 0;
  const totalMinCharge = perGuestNum * guestsNum;

  const handleSave = async () => {
    try {
      await updateTableMutation.mutateAsync({
        id: table.id,
        data: {
          minimum_charge_enabled: enabled,
          minimum_charge_per_guest: perGuestNum,
          minimum_charge_guests: guestsNum
        }
      });
      toast.success(enabled ? `Minimum charge set for Table ${table.table_number}` : `Minimum charge disabled for Table ${table.table_number}`);
      onClose();
    } catch (error) {
      toast.error("Failed to save minimum charge settings");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            Minimum Charge — Table {table?.table_number}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Enable Minimum Charge</p>
              <p className="text-xs text-slate-500">Enforce a minimum spend for this table</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    Per Guest (EGP)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={perGuest}
                    onChange={(e) => setPerGuest(e.target.value)}
                    placeholder="e.g. 600"
                    className="text-right"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Number of Guests
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    placeholder="e.g. 3"
                    className="text-right"
                  />
                </div>
              </div>

              {totalMinCharge > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-900">
                      Total Minimum Charge
                    </span>
                    <span className="text-lg font-bold text-amber-700">
                      {formatCurrency(perGuestNum)} × {guestsNum} = {formatCurrency(totalMinCharge)}
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    If items + tax + service are below this amount, the check total will be raised to {formatCurrency(totalMinCharge)}.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateTableMutation.isPending || (enabled && (perGuestNum <= 0 || guestsNum <= 0))}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              {updateTableMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}