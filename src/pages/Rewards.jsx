import { useState, useMemo } from "react";
import { brandName } from "@/lib/brandName";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Gift, Search, PoundSterling, Ticket, User, History,
  ChevronRight, Clock
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import RewardCard from "@/components/rewards/RewardCard";
import RedemptionDialog from "@/components/rewards/RedemptionDialog";
import CategoryFilter from "@/components/rewards/CategoryFilter";
import RestaurantLogo from "@/components/RestaurantLogo";

import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";

export default function Rewards() {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedReward, setSelectedReward] = useState(null);
  const [redemptionResult, setRedemptionResult] = useState(null);
  const [requestedTab, setActiveTab] = useState("rewards");
  // Tabs closed in Admin › Modules are left out; a closed tab falls back to the other one.
  const screenTabs = useScreenTabs("Rewards");
  const activeTab = screenTabs.pick(requestedTab, ["rewards", "history"]);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = useIsAdmin();
  const { permissions } = usePermissions();
  const canRedeemForClients = isAdmin || permissions?.rewards_manage === true;

  const { data: rewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => base44.entities.Reward.list("-created_date")
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date")
  });

  const { data: redemptions = [] } = useQuery({
    queryKey: ["redemptions"],
    queryFn: () => base44.entities.Redemption.list("-created_date")
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list("min_referrals")
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const query = clientSearchQuery.toLowerCase().trim();
    return clients.filter(client => 
      client.name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query)
    );
  }, [clients, clientSearchQuery]);

  const clientRedemptions = useMemo(() => 
    redemptions.filter(r => r.client_id === selectedClientId),
    [redemptions, selectedClientId]
  );

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] })
  });

  const createRedemptionMutation = useMutation({
    mutationFn: (data) => base44.entities.Redemption.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["redemptions"] })
  });

  const handleRedeem = async () => {
    if (!selectedClient || !selectedReward) return;

    const redemptionCode = `RWD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create redemption record
    const redemption = await createRedemptionMutation.mutateAsync({
      client_id: selectedClient.id,
      reward_id: selectedReward.id,
      reward_name: selectedReward.name,
      cashback_spent: selectedReward.cashback_cost,
      status: "pending",
      redemption_code: redemptionCode
    });

    // Deduct cashback from client
    await updateClientMutation.mutateAsync({
      id: selectedClient.id,
      data: {
        cashback_earned: (selectedClient.cashback_earned || 0) - selectedReward.cashback_cost
      }
    });

    // Handle referrer cashback bonus if client has a referrer
    if (selectedClient.referred_by) {
      const referrer = clients.find(c => c.id === selectedClient.referred_by);
      if (referrer) {
        // Calculate referrer's direct referrals to determine tier
        const referrerDirectReferrals = clients.filter(c => c.referred_by === referrer.id);
        const sortedTiers = [...tiers].sort((a, b) => b.min_referrals - a.min_referrals);
        const referrerTier = sortedTiers.find(t => referrerDirectReferrals.length >= t.min_referrals) || tiers.find(t => t.is_default);

        if (referrerTier) {
          // Calculate cashback bonus based on redemption cost
          const cashbackBonus = selectedReward.cashback_cost * (referrerTier.cashback_percentage / 100);

          // Add cashback to referrer's balance
          await updateClientMutation.mutateAsync({
            id: referrer.id,
            data: {
              cashback_earned: (referrer.cashback_earned || 0) + cashbackBonus
            }
          });

          // Log the referral bonus transaction
          await base44.entities.ReferralBonus.create({
            referrer_id: referrer.id,
            referrer_name: referrer.name,
            referred_client_id: selectedClient.id,
            referred_client_name: selectedClient.name,
            redemption_id: redemption.id,
            reward_name: selectedReward.name,
            cashback_amount: cashbackBonus,
            cashback_percentage: referrerTier.cashback_percentage,
            redemption_cost: selectedReward.cashback_cost
          });

          // Send notification to referrer
          if (referrer.email) {
            try {
              await base44.integrations.Core.SendEmail({
                to: referrer.email,
                subject: "🎉 You Earned Cashback from a Referral Redemption!",
                body: `Hi ${referrer.name},\n\nGreat news! ${selectedClient.name}, someone you referred, just redeemed a reward: ${selectedReward.name}.\n\nYou've earned £${cashbackBonus.toFixed(2)} cashback (${referrerTier.cashback_percentage}% of redemption value) thanks to your ${referrerTier.level_name} tier!\n\nYour new cashback balance: £${((referrer.cashback_earned || 0) + cashbackBonus).toFixed(2)}\n\nKeep sharing your referral code to earn more!\n\nBest regards,\n${brandName()} Partner Team`
              });
            } catch (error) {
              console.error("Failed to send referrer notification:", error);
            }
          }

          toast.success(`Reward redeemed! £${cashbackBonus.toFixed(2)} bonus added to referrer`);
        }
      }
    } else {
      toast.success("Reward redeemed successfully!");
    }

    setRedemptionResult({ ...redemption, redemption_code: redemptionCode });
  };

  const filteredRewards = useMemo(() => {
    return rewards.filter(reward => {
      const matchesSearch = !searchQuery || 
        reward.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reward.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || reward.category === categoryFilter;
      const isActive = reward.is_redeemable !== false;
      return matchesSearch && matchesCategory && isActive;
    });
  }, [rewards, searchQuery, categoryFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <RestaurantLogo className="h-10 mb-2" />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{brandName()} Loyalty</h1>
          <p className="text-slate-500 mt-1">Redeem cashback for exclusive rewards and discounts</p>
        </div>

        {/* Client Selection - Only for Admins */}
        {canRedeemForClients && (
          <Card className="p-6 mb-6 border-0 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Select Client</p>
                  <p className="font-medium">Search by name, email, or phone</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search clients..."
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>

                {selectedClient && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg">
                    <PoundSterling className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-slate-600">Balance:</span>
                    <span className="font-bold text-emerald-700">
                      £{(selectedClient.cashback_earned || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Search Results */}
              {clientSearchQuery && (
                <div className="max-h-64 overflow-y-auto space-y-2 border-t pt-4">
                  {filteredClients.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No clients found</p>
                  ) : (
                    filteredClients.map(client => (
                      <button
                        key={client.id}
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setClientSearchQuery("");
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          selectedClientId === client.id 
                            ? 'bg-amber-50 border-amber-300' 
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-medium text-slate-900">{client.name}</p>
                          <p className="text-xs text-slate-500">{client.email} • {client.phone}</p>
                        </div>
                        <Badge variant="outline">
                          £{(client.cashback_earned || 0).toFixed(2)}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected Client Display */}
              {selectedClient && !clientSearchQuery && (
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-300">
                  <div>
                    <p className="font-medium text-slate-900">{selectedClient.name}</p>
                    <p className="text-xs text-slate-500">{selectedClient.email}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedClientId("")}
                  >
                    Change
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Tabs */}
        {activeTab && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            {screenTabs.isOpen("rewards") && (
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Available Rewards
            </TabsTrigger>
            )}
            {screenTabs.isOpen("history") && (
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Redemption History
            </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
        )}

        {!activeTab ? <ClosedTabsNotice /> : activeTab === "rewards" ? (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search rewards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
            </div>

            {/* Rewards Grid */}
            {loadingRewards ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 bg-white rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredRewards.length === 0 ? (
              <Card className="p-12 text-center border-0 shadow-sm">
                <Gift className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="font-medium text-slate-900">No rewards available</h3>
                <p className="text-sm text-slate-500 mt-1">Check back later for new rewards</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRewards.map(reward => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    clientCashback={canRedeemForClients ? (selectedClient?.cashback_earned || 0) : 0}
                    onRedeem={() => {
                      if (!canRedeemForClients) {
                        toast.error("You don't have permission to process redemptions");
                        return;
                      }
                      if (!selectedClientId) {
                        toast.error("Please select a client first");
                        return;
                      }
                      setSelectedReward(reward);
                      setRedemptionResult(null);
                    }}
                    isRedeeming={!canRedeemForClients}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* Redemption History */
          <div className="space-y-3">
            {!selectedClientId ? (
              <Card className="p-12 text-center border-0 shadow-sm">
                <User className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="font-medium text-slate-900">Select a client</h3>
                <p className="text-sm text-slate-500 mt-1">Choose a client to view their redemption history</p>
              </Card>
            ) : clientRedemptions.length === 0 ? (
              <Card className="p-12 text-center border-0 shadow-sm">
                <Ticket className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="font-medium text-slate-900">No redemptions yet</h3>
                <p className="text-sm text-slate-500 mt-1">This client hasn't redeemed any rewards</p>
              </Card>
            ) : (
              clientRedemptions.map(redemption => (
                <Card key={redemption.id} className="p-4 border-0 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Ticket className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{redemption.reward_name}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(redemption.created_date), "MMM d, yyyy")}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{redemption.redemption_code}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">-£{redemption.cashback_spent?.toFixed(2)}</p>
                      <Badge variant={
                        redemption.status === "used" ? "default" :
                        redemption.status === "expired" ? "destructive" : "secondary"
                      }>
                        {redemption.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Redemption Dialog */}
      <RedemptionDialog
        open={!!selectedReward}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReward(null);
            setRedemptionResult(null);
          }
        }}
        reward={selectedReward}
        client={selectedClient}
        onConfirm={handleRedeem}
        isProcessing={createRedemptionMutation.isPending || updateClientMutation.isPending}
        redemptionResult={redemptionResult}
      />
    </div>
  );
}