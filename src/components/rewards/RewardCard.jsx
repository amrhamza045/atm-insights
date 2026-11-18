import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Percent, Coffee, Star, PoundSterling } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryIcons = {
  voucher: Gift,
  discount: Percent,
  free_item: Coffee,
  experience: Star
};

const categoryColors = {
  voucher: "bg-amber-100 text-amber-700",
  discount: "bg-emerald-100 text-emerald-700",
  free_item: "bg-violet-100 text-violet-700",
  experience: "bg-rose-100 text-rose-700"
};

export default function RewardCard({ reward, clientCashback, onRedeem, isRedeeming, showClientView = false, canRedeem = true }) {
  const [customAmount, setCustomAmount] = useState("");
  const Icon = categoryIcons[reward.category] || Gift;
  const isVariableCost = reward.is_variable_cost;
  const canAfford = isVariableCost 
    ? parseFloat(customAmount) > 0 && parseFloat(customAmount) <= clientCashback
    : (showClientView ? canRedeem : (clientCashback >= reward.cashback_cost));
  const isAvailable = reward.is_redeemable !== false;

  const handleRedeem = () => {
    if (isVariableCost) {
      onRedeem({ ...reward, cashback_cost: parseFloat(customAmount) });
    } else {
      onRedeem(reward);
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 border-0 shadow-sm hover:shadow-lg",
      !isAvailable && "opacity-60"
    )}>
      <div className="h-32 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center relative">
        <Icon className="w-16 h-16 text-white/80" />
        <Badge className={cn("absolute top-3 right-3", categoryColors[reward.category])}>
          {reward.category?.replace("_", " ")}
        </Badge>
        {isVariableCost && (
          <Badge className="absolute top-3 left-3 bg-blue-600 text-white">
            Variable
          </Badge>
        )}
      </div>
      
      <div className="p-5">
        <h3 className="font-semibold text-lg text-slate-900 mb-1">{reward.name}</h3>
        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{reward.description}</p>
        
        {isVariableCost ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Enter amount to redeem:</label>
              <div className="flex items-center gap-2">
                <PoundSterling className="w-4 h-4 text-amber-500" />
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={clientCashback}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-slate-400">Available: £{clientCashback.toFixed(2)}</p>
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={!canAfford || !isAvailable || isRedeeming || !customAmount}
              onClick={handleRedeem}
              className={cn(
                "w-full",
                canAfford && isAvailable && customAmount
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-slate-200 text-slate-500"
              )}
            >
              {isRedeeming ? "..." : !isAvailable ? "Unavailable" : showClientView ? "Request" : "Redeem"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <PoundSterling className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-lg text-slate-900">{reward.cashback_cost.toFixed(2)}</span>
              <span className="text-sm text-slate-500">cashback</span>
            </div>
            
            <Button
              size="sm"
              disabled={!canAfford || !isAvailable || isRedeeming}
              onClick={handleRedeem}
              className={cn(
                canAfford && isAvailable
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-slate-200 text-slate-500"
              )}
            >
              {isRedeeming ? "..." : !isAvailable ? "Unavailable" : !canAfford ? "Not enough" : showClientView ? "Request" : "Redeem"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}