import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RedemptionDialog({ 
  open, 
  onOpenChange, 
  reward, 
  client, 
  onConfirm, 
  isProcessing,
  redemptionResult 
}) {
  if (!reward || !client) return null;

  const newBalance = (client.cashback_earned || 0) - reward.cashback_cost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Gift className="w-4 h-4 text-amber-600" />
            </div>
            {redemptionResult ? "Redemption Complete!" : "Confirm Redemption"}
          </DialogTitle>
        </DialogHeader>

        {redemptionResult ? (
          <div className="py-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Reward Redeemed!</h3>
            <p className="text-slate-500 mb-4">Your redemption code:</p>
            <div className="bg-slate-100 rounded-lg p-4 font-mono text-lg font-bold tracking-wider">
              {redemptionResult.redemption_code}
            </div>
            <p className="text-sm text-slate-500 mt-4">
              Show this code to staff to claim your reward
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="font-medium text-slate-900 mb-1">{reward.name}</h4>
              <p className="text-sm text-slate-500">{reward.description}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Current Balance</span>
                <span className="font-medium">£{(client.cashback_earned || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Reward Cost</span>
                <span className="font-medium text-red-600">-£{reward.cashback_cost.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">New Balance</span>
                <span className={cn(
                  "font-bold",
                  newBalance >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  £{newBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {newBalance < 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                Insufficient cashback balance
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {redemptionResult ? (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                disabled={newBalance < 0 || isProcessing}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Redemption
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}