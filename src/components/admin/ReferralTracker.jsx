import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, GitBranch, TrendingUp, PoundSterling, Network, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function ReferralTracker({ clients, tiers = [], onSelectClient }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("referrals");
  const [filterTier, setFilterTier] = useState("all");
  const [expandedClient, setExpandedClient] = useState(null);

  const getDirectReferrals = (clientId) =>
    clients.filter(c => c.referred_by === clientId);

  const getNetworkSize = (clientId) => {
    const direct = getDirectReferrals(clientId);
    return direct.reduce((sum, child) => sum + 1 + getNetworkSize(child.id), 0);
  };

  const getClientName = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    return c?.name || "Unknown";
  };

  const trackerData = useMemo(() => {
    let data = clients.map(client => {
      const directRefs = getDirectReferrals(client.id);
      const networkSize = directRefs.reduce((sum, child) => sum + 1 + getNetworkSize(child.id), 0);
      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        referralCode: client.referral_code,
        tierName: client.current_tier_name || client.loyalty_tier_name || "No Tier",
        tierId: client.current_tier_id,
        status: client.status,
        directReferrals: directRefs.length,
        networkSize,
        cashbackEarned: client.cashback_earned || 0,
        availablePayout: client.available_payout || 0,
        totalSpent: client.total_spent || 0,
        directReferralIds: directRefs.map(r => r.id),
      };
    });

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.phone?.includes(q) ||
        d.referralCode?.toLowerCase().includes(q)
      );
    }

    // Filter by tier
    if (filterTier !== "all") {
      data = data.filter(d => d.tierId === filterTier);
    }

    // Sort
    data.sort((a, b) => {
      switch (sortBy) {
        case "referrals": return b.directReferrals - a.directReferrals;
        case "network": return b.networkSize - a.networkSize;
        case "cashback": return b.cashbackEarned - a.cashbackEarned;
        case "name": return a.name?.localeCompare(b.name || "");
        default: return 0;
      }
    });

    return data;
  }, [clients, searchQuery, filterTier, sortBy]);

  const totals = useMemo(() => ({
    totalReferrers: trackerData.filter(d => d.directReferrals > 0).length,
    totalDirectReferrals: trackerData.reduce((sum, d) => sum + d.directReferrals, 0),
    totalNetwork: trackerData.reduce((sum, d) => sum + d.networkSize, 0),
    totalCashback: trackerData.reduce((sum, d) => sum + d.cashbackEarned, 0),
  }), [trackerData]);

  if (clients.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900">No clients yet</h3>
          <p className="text-sm text-slate-500 mt-1">Add clients to start tracking referrals</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium text-slate-600">Active Referrers</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totals.totalReferrers}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-violet-600 mb-1">
              <GitBranch className="w-4 h-4" />
              <span className="text-xs font-medium text-slate-600">Direct Referrals</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totals.totalDirectReferrals}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Network className="w-4 h-4" />
              <span className="text-xs font-medium text-slate-600">Total Network Size</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totals.totalNetwork}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <PoundSterling className="w-4 h-4" />
              <span className="text-xs font-medium text-slate-600">Total Cashback</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totals.totalCashback)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, phone, or referral code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="referrals">Most Direct Referrals</SelectItem>
                <SelectItem value="network">Largest Network</SelectItem>
                <SelectItem value="cashback">Most Cashback</SelectItem>
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

      {/* Tracker Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-amber-500" />
            Referral Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {trackerData.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No clients match your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {trackerData.map((client, index) => {
                const isExpanded = expandedClient === client.id;
                const hasReferrals = client.directReferrals > 0;
                return (
                  <div key={client.id}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                      onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                    >
                      {/* Expand toggle */}
                      <div className="w-6 flex-shrink-0">
                        {hasReferrals && (
                          <button className="text-slate-400 hover:text-slate-600">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Rank */}
                      <div className="w-8 text-center text-xs font-semibold text-slate-400 flex-shrink-0">
                        #{index + 1}
                      </div>

                      {/* Name & code */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{client.name}</span>
                          {client.status === "active" && (
                            <Badge className="text-xs bg-green-100 text-green-700">Active</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">{client.tierName}</Badge>
                        </div>
                        {client.referralCode && (
                          <span className="text-xs text-slate-400">Code: {client.referralCode}</span>
                        )}
                      </div>

                      {/* Direct referrals */}
                      <div className="text-center w-20 flex-shrink-0">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5 text-violet-500" />
                          <span className="font-bold text-slate-900">{client.directReferrals}</span>
                        </div>
                        <div className="text-xs text-slate-500">Direct</div>
                      </div>

                      {/* Network size */}
                      <div className="text-center w-20 flex-shrink-0 hidden sm:block">
                        <div className="flex items-center justify-center gap-1">
                          <Network className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-bold text-slate-900">{client.networkSize}</span>
                        </div>
                        <div className="text-xs text-slate-500">Network</div>
                      </div>

                      {/* Cashback */}
                      <div className="text-center w-28 flex-shrink-0 hidden md:block">
                        <div className="font-semibold text-emerald-600">{formatCurrency(client.cashbackEarned)}</div>
                        <div className="text-xs text-slate-500">Cashback</div>
                      </div>

                      {/* Action */}
                      {onSelectClient && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClient(clients.find(c => c.id === client.id));
                          }}
                        >
                          View
                          <ChevronLeft className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>

                    {/* Expanded referral list */}
                    <AnimatePresence>
                      {isExpanded && hasReferrals && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-amber-50/30"
                        >
                          <div className="pl-16 pr-4 py-3 space-y-1.5 border-l-2 border-amber-200 ml-4">
                            <p className="text-xs font-semibold text-slate-600 mb-1">
                              {client.directReferrals} direct referral{client.directReferrals !== 1 ? "s" : ""}:
                            </p>
                            {client.directReferralIds.map(refId => {
                              const ref = clients.find(c => c.id === refId);
                              if (!ref) return null;
                              const refNetwork = getNetworkSize(ref.id);
                              return (
                                <div key={refId} className="flex items-center gap-2 text-sm py-1">
                                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                                  <span className="font-medium text-slate-700 flex-1">{ref.name}</span>
                                  <Badge variant="outline" className="text-xs">{ref.current_tier_name || "No Tier"}</Badge>
                                  <span className="text-xs text-slate-500">{formatCurrency(ref.cashback_earned || 0)}</span>
                                  {refNetwork > 0 && (
                                    <span className="text-xs text-blue-600 flex items-center gap-0.5">
                                      <Network className="w-3 h-3" />
                                      {refNetwork + 1}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}