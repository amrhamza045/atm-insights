import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Crown, Star, TrendingUp, Gift, Zap } from "lucide-react";

export default function LoyaltyTierDisplay({ client }) {
  const { data: tiers = [] } = useQuery({
    queryKey: ["loyaltyTiers"],
    queryFn: () => base44.entities.LoyaltyTier.list()
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["clientPayouts", client.id],
    queryFn: async () => {
      const allPayouts = await base44.entities.Payout.list();
      return allPayouts.filter(p => p.client_id === client.id && p.status === "completed");
    }
  });

  const sortedTiers = [...tiers].sort((a, b) => a.tier_level - b.tier_level);
  
  const totalCashbackEarned = client.cashback_earned || 0;
  const successfulPayouts = payouts.length;

  // Determine current tier
  let currentTier = null;
  for (let i = sortedTiers.length - 1; i >= 0; i--) {
    const tier = sortedTiers[i];
    if (totalCashbackEarned >= tier.min_cashback_earned && 
        successfulPayouts >= tier.min_successful_payouts) {
      currentTier = tier;
      break;
    }
  }

  // Determine next tier
  const currentIndex = currentTier ? sortedTiers.findIndex(t => t.id === currentTier.id) : -1;
  const nextTier = currentIndex < sortedTiers.length - 1 ? sortedTiers[currentIndex + 1] : null;

  // Calculate progress to next tier
  let progressPercentage = 0;
  let progressText = "";
  if (nextTier) {
    const cashbackProgress = totalCashbackEarned / nextTier.min_cashback_earned;
    const payoutProgress = successfulPayouts / nextTier.min_successful_payouts;
    progressPercentage = Math.min(cashbackProgress, payoutProgress) * 100;
    
    const needsCashback = Math.max(0, nextTier.min_cashback_earned - totalCashbackEarned);
    const needsPayouts = Math.max(0, nextTier.min_successful_payouts - successfulPayouts);
    
    if (needsCashback > 0 || needsPayouts > 0) {
      progressText = `Earn £${needsCashback.toFixed(0)} more${needsPayouts > 0 ? ` and complete ${needsPayouts} more payout${needsPayouts > 1 ? 's' : ''}` : ''} to unlock ${nextTier.tier_name}`;
    }
  }

  const getTierIcon = (iconName) => {
    switch (iconName) {
      case "crown": return Crown;
      case "star": return Star;
      default: return Award;
    }
  };

  if (sortedTiers.length === 0) {
    return null;
  }

  const CurrentTierIcon = currentTier ? getTierIcon(currentTier.icon) : Award;

  return (
    <Card className="border-2" style={{ borderColor: currentTier?.color || "#94a3b8" }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Loyalty Tier Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Tier */}
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: (currentTier?.color || "#94a3b8") + "20" }}
          >
            <CurrentTierIcon 
              className="w-8 h-8" 
              style={{ color: currentTier?.color || "#94a3b8" }} 
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold">{currentTier?.tier_name || "No Tier"}</h3>
              {currentTier && (
                <Badge style={{ backgroundColor: currentTier.color, color: "white" }}>
                  Level {currentTier.tier_level}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600">
              £{totalCashbackEarned.toFixed(0)} earned • {successfulPayouts} payout{successfulPayouts !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Current Benefits */}
        {currentTier && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Your Benefits
            </h4>
            <div className="space-y-1 text-sm">
              {currentTier.payout_percentage_bonus > 0 && (
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>+{currentTier.payout_percentage_bonus}% payout bonus</span>
                </div>
              )}
              {currentTier.min_payout_reduction > 0 && (
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>£{currentTier.min_payout_reduction} lower minimum payout</span>
                </div>
              )}
              {currentTier.priority_support && (
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Priority customer support</span>
                </div>
              )}
              {currentTier.exclusive_promotions && (
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Access to exclusive promotions</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress to Next Tier */}
        {nextTier && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress to {nextTier.tier_name}</span>
              <span className="text-sm text-slate-500">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            {progressText && (
              <p className="text-xs text-slate-500 mt-2">{progressText}</p>
            )}
          </div>
        )}

        {/* All Tiers Overview */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">All Tiers</h4>
          <div className="space-y-2">
            {sortedTiers.map((tier) => {
              const TierIcon = getTierIcon(tier.icon);
              const isCurrentTier = currentTier?.id === tier.id;
              const isLocked = totalCashbackEarned < tier.min_cashback_earned || 
                              successfulPayouts < tier.min_successful_payouts;
              
              return (
                <div 
                  key={tier.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isCurrentTier ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
                  } ${isLocked && !isCurrentTier ? 'opacity-50' : ''}`}
                >
                  <TierIcon className="w-5 h-5" style={{ color: tier.color }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{tier.tier_name}</span>
                      {isCurrentTier && (
                        <Badge className="bg-amber-500 text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      £{tier.min_cashback_earned}+ • {tier.min_successful_payouts}+ payouts
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}