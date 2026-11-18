import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Trophy, TrendingUp, Users, Award, Search, Crown, Medal } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";

export default function ReferralLeaderboard() {
  const [sortBy, setSortBy] = useState("referrals");
  const [filterTier, setFilterTier] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  // Aggregates only (who has purchased, cashback per referrer) — computed on the server.
  const { data: purchaseStats, isLoading: purchasesLoading } = useQuery({
    queryKey: ["referralLeaderboardStats"],
    queryFn: async () => (await base44.functions.invoke("getReferralPurchaseStats", { view: "leaderboard" })).data
  });
  const buyerIds = useMemo(() => new Set(purchaseStats?.buyer_ids || []), [purchaseStats]);

  const { data: tiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list()
  });

  const leaderboardData = useMemo(() => {
    if (!clients.length || !buyerIds.size) return [];

    const activeClients = clients.filter(c => c.status === "active");

    const clientStats = activeClients.map(client => {
      // Find all direct referrals
      const directReferrals = clients.filter(c => c.referred_by === client.id);
      
      // Find successful referrals (those who made purchases)
      const successfulReferrals = directReferrals.filter(referral => 
        buyerIds.has(referral.id)
      );

      // Total cashback from referrals (where this client is the referrer)
      const totalCashback = purchaseStats?.cashback_by_referrer?.[client.id] || 0;

      // Get full network size (recursive)
      const getNetworkSize = (clientId) => {
        const directRefs = clients.filter(c => c.referred_by === clientId);
        let total = directRefs.length;
        directRefs.forEach(ref => {
          total += getNetworkSize(ref.id);
        });
        return total;
      };

      return {
        id: client.id,
        name: client.name,
        referralCode: client.referral_code,
        tierName: client.current_tier_name || "No Tier",
        tierId: client.current_tier_id,
        directReferrals: directReferrals.length,
        successfulReferrals: successfulReferrals.length,
        networkSize: getNetworkSize(client.id),
        totalCashback: totalCashback,
        cashbackBalance: client.cashback_earned || 0,
        availablePayout: client.available_payout || 0
      };
    });

    // Filter by search query
    let filtered = clientStats.filter(stat => 
      stat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stat.referralCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter by tier
    if (filterTier !== "all") {
      filtered = filtered.filter(stat => stat.tierId === filterTier);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "referrals":
          return b.successfulReferrals - a.successfulReferrals;
        case "network":
          return b.networkSize - a.networkSize;
        case "cashback":
          return b.totalCashback - a.totalCashback;
        case "balance":
          return b.cashbackBalance - a.cashbackBalance;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [clients, buyerIds, purchaseStats, searchQuery, filterTier, sortBy]);

  const topThree = leaderboardData.slice(0, 3);
  const rest = leaderboardData.slice(3);

  const getRankIcon = (index) => {
    if (index === 0) return { icon: Crown, color: "text-amber-500", bg: "bg-amber-50" };
    if (index === 1) return { icon: Award, color: "text-slate-400", bg: "bg-slate-50" };
    if (index === 2) return { icon: Medal, color: "text-orange-600", bg: "bg-orange-50" };
    return null;
  };

  if (clientsLoading || purchasesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Referral Leaderboard</h1>
        <p className="text-slate-600">Top performers in the partnership program</p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name or referral code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referrals">Successful Referrals</SelectItem>
                <SelectItem value="network">Network Size</SelectItem>
                <SelectItem value="cashback">Total Cashback</SelectItem>
                <SelectItem value="balance">Cashback Balance</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {tiers.map(tier => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.level_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {topThree.map((client, index) => {
            const rankInfo = getRankIcon(index);
            const Icon = rankInfo?.icon;
            
            return (
              <Card key={client.id} className={`border-2 ${index === 0 ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white' : 'border-slate-200'} shadow-lg`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-full ${rankInfo?.bg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${rankInfo?.color}`} />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">
                    <Link 
                      to={createPageUrl("Home") + `?clientId=${client.id}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {client.name}
                    </Link>
                  </CardTitle>
                  <Badge className="w-fit text-xs">{client.tierName}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Successful Referrals:</span>
                      <span className="font-semibold">{client.successfulReferrals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Network Size:</span>
                      <span className="font-semibold">{client.networkSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Cashback:</span>
                      <span className="font-semibold text-green-600">
                        £{client.totalCashback.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Balance:</span>
                      <span className="font-semibold">
                        £{client.cashbackBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rest of Leaderboard */}
      {rest.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Full Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rest.map((client, index) => (
                <div 
                  key={client.id}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 text-center font-semibold text-slate-400">
                    #{index + 4}
                  </div>
                  <div className="flex-1">
                    <Link 
                      to={createPageUrl("Home") + `?clientId=${client.id}`}
                      className="font-semibold hover:text-blue-600 transition-colors"
                    >
                      {client.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {client.tierName}
                      </Badge>
                      {client.referralCode && (
                        <span className="text-xs text-slate-500">
                          Code: {client.referralCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Users className="w-4 h-4" />
                        <span>{client.successfulReferrals}</span>
                      </div>
                      <div className="text-xs text-slate-500">Successful</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-slate-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>{client.networkSize}</span>
                      </div>
                      <div className="text-xs text-slate-500">Network</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">
                        £{client.totalCashback.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">Cashback</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {leaderboardData.length === 0 && (
        <Card className="p-12 text-center border-0 shadow-sm">
          <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900">No results found</h3>
          <p className="text-sm text-slate-500 mt-1">
            Try adjusting your filters or search query
          </p>
        </Card>
      )}
    </div>
  );
}