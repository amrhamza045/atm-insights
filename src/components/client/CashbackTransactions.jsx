import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Trophy } from "lucide-react";
import { format } from "date-fns";
import useReferralPurchaseStats from "@/components/client/useReferralPurchaseStats";

const sourceIcons = {
  self_registration: { icon: Users, color: "text-purple-500", bg: "bg-purple-50", label: "Self-Registration Cashback" },
  self_cashback: { icon: TrendingUp, color: "text-cyan-500", bg: "bg-cyan-50", label: "Self-Purchase Cashback" },
  network_registration: { icon: Users, color: "text-green-500", bg: "bg-green-50", label: "Network Registration Bonus" },
  network_purchase: { icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50", label: "Network Purchase Cashback" },
  milestone: { icon: Trophy, color: "text-amber-500", bg: "bg-amber-50", label: "Milestone Achievement" },
  redemption: { icon: TrendingUp, color: "text-red-500", bg: "bg-red-50", label: "Redemption Spent" }
};

export default function CashbackTransactions({ clientId, clients = [] }) {
  const { data: myClient } = useQuery({
    queryKey: ["myClient", clientId],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      return allClients.find(c => c.id === clientId);
    },
    enabled: !!clientId
  });

  // Cashback from referrals: computed on the server, other clients' records never load here.
  const { data: stats } = useReferralPurchaseStats(clientId);
  const purchases = stats?.referral_cashback || [];

  const { data: selfPurchases = [] } = useQuery({
    queryKey: ["selfPurchases", clientId],
    queryFn: async () => {
      const own = await base44.entities.Purchase.filter({ client_id: clientId }, "-created_date");
      return own.filter(p => p.cashback_earned > 0);
    },
    enabled: !!clientId
  });

  const { data: referralBonuses = [] } = useQuery({
    queryKey: ["referralBonuses", clientId],
    queryFn: async () => {
      const allBonuses = await base44.entities.ReferralBonus.list("-created_date");
      return allBonuses.filter(b => b.referrer_id === clientId);
    },
    enabled: !!clientId
  });

  const { data: milestoneAchievements = [] } = useQuery({
    queryKey: ["milestoneAchievements", clientId],
    queryFn: async () => {
      const allAchievements = await base44.entities.MilestoneAchievement.list("-created_date");
      return allAchievements.filter(m => m.client_id === clientId);
    },
    enabled: !!clientId
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["myRedemptions", clientId],
    queryFn: async () => {
      const allRedemptions = await base44.entities.Redemption.list("-created_date");
      return allRedemptions.filter(r => r.client_id === clientId && r.cashback_spent > 0);
    },
    enabled: !!clientId
  });

  // Combine all transactions
  const allTransactions = [
    // Self-registration cashback (welcome cashback)
    ...(myClient?.welcome_cashback_balance > 0 ? [{
      id: "self-registration",
      type: "self_registration",
      amount: myClient.welcome_cashback_balance,
      date: myClient.created_date,
      description: `Welcome cashback from your registration`,
      reference: myClient.id
    }] : []),
    // Self-purchase cashback
    ...selfPurchases.map(p => ({
      id: `self-purchase-${p.id}`,
      type: "self_cashback",
      amount: p.cashback_earned,
      date: p.created_date,
      description: `Your purchase amount: £${p.amount}`,
      reference: p.id
    })),
    // Network registration bonus (direct referrals)
    ...referralBonuses.map(b => ({
      id: `bonus-${b.id}`,
      type: "network_registration",
      amount: b.cashback_amount,
      date: b.created_date,
      description: `Bonus from ${b.referred_client_name}'s registration`,
      reference: b.id
    })),
    // Network purchase cashback
    ...purchases.map(p => ({
      id: `purchase-${p.id}`,
      type: "network_purchase",
      amount: p.cashback_earned,
      date: p.created_date,
      description: `Cashback from ${p.client_name}'s purchase`,
      reference: p.id
    })),
    // Milestone bonus
    ...milestoneAchievements.map(m => ({
      id: `milestone-${m.id}`,
      type: "milestone",
      amount: m.bonus_awarded,
      date: m.created_date,
      description: `${m.milestone_name} milestone achieved`,
      reference: m.id
    })),
    // Redemptions (negative)
    ...redemptions.map(r => ({
      id: `redemption-${r.id}`,
      type: "redemption",
      amount: -r.cashback_spent,
      date: r.created_date,
      description: `Redeemed: ${r.reward_name}`,
      reference: r.id
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalCashback = allTransactions.reduce((sum, t) => sum + t.amount, 0);

  if (allTransactions.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Cashback Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No cashback transactions yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Cashback Transactions
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Balance</p>
            <p className="text-2xl font-bold text-slate-900">{totalCashback.toFixed(2)} EGP</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {allTransactions.map((transaction) => {
            const config = sourceIcons[transaction.type];
            const Icon = config.icon;
            const isNegative = transaction.amount < 0;

            return (
              <div 
                key={transaction.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${config.bg} border-slate-200`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{config.label}</p>
                    <p className="text-xs text-slate-600">{transaction.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(transaction.date), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${isNegative ? "text-red-600" : "text-green-600"}`}>
                    {isNegative ? "-" : "+"}{Math.abs(transaction.amount).toFixed(2)} EGP
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {transaction.type}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}