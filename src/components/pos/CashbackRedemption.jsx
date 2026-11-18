import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PoundSterling, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function CashbackRedemption({ 
  customer, 
  total, 
  onRedeem, 
  disabled = false 
}) {
  const [redeemMode, setRedeemMode] = useState(null); // null, 'full', 'partial'
  const [customAmount, setCustomAmount] = useState("");

  if (!customer || (customer.cashback_earned || 0) === 0) {
    return null;
  }

  const availableCashback = customer.cashback_earned || 0;
  const maxRedeemable = Math.min(availableCashback, total);

  const handleFullRedeem = () => {
    onRedeem(maxRedeemable);
    setRedeemMode(null);
    setCustomAmount("");
  };

  const handlePartialRedeem = () => {
    const amount = parseFloat(customAmount);
    if (!amount || amount <= 0) {
      return;
    }
    if (amount > maxRedeemable) {
      return;
    }
    onRedeem(amount);
    setRedeemMode(null);
    setCustomAmount("");
  };

  const handleCancel = () => {
    setRedeemMode(null);
    setCustomAmount("");
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <PoundSterling className="w-4 h-4 text-amber-600" />
          Use Cashback as Discount
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-2 bg-white rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Available Cashback</span>
            <span className="font-bold text-amber-700">{formatCurrency(availableCashback)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-slate-600">Can Use (up to bill)</span>
            <span className="font-bold text-green-700">{formatCurrency(maxRedeemable)}</span>
          </div>
        </div>

        {redeemMode === null ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRedeemMode("full")}
              disabled={disabled || maxRedeemable === 0}
              className="flex-1"
            >
              Full Amount
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRedeemMode("partial")}
              disabled={disabled || maxRedeemable === 0}
              className="flex-1"
            >
              Custom Amount
            </Button>
          </div>
        ) : redeemMode === "full" ? (
          <div className="space-y-3 p-3 bg-white rounded-lg border border-amber-300">
            <div>
              <p className="text-sm font-medium mb-2">Redeem Full Amount?</p>
              <div className="p-2 bg-amber-50 rounded text-sm">
                <span className="font-bold text-amber-700">{formatCurrency(maxRedeemable)}</span>
                <span className="text-slate-600"> will be deducted from bill</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFullRedeem}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                Confirm
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-3 bg-white rounded-lg border border-amber-300">
            <div>
              <p className="text-sm font-medium mb-2">Enter Amount</p>
              <Input
                type="number"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                step="0.01"
                min="0"
                max={maxRedeemable}
                className="text-right"
              />
              <p className="text-xs text-slate-500 mt-1">
                Max: {formatCurrency(maxRedeemable)}
              </p>
            </div>
            {customAmount && parseFloat(customAmount) > maxRedeemable && (
              <div className="p-2 bg-red-50 border border-red-200 rounded flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-red-700">Amount exceeds available cashback</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePartialRedeem}
                disabled={!customAmount || parseFloat(customAmount) <= 0 || parseFloat(customAmount) > maxRedeemable}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}