import { useState, useMemo, useEffect } from "react";
import { brandName } from "@/lib/brandName";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/components/LanguageProvider";
import { usePullToRefresh } from "@/components/hooks/usePullToRefresh";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, PoundSterling, Users, Trophy, Copy, Check,
  GitBranch, TrendingUp, Mail, Clock, Search, Loader2, Gift, Handshake, BarChart3, Wallet, MapPin, Settings, Award, Share2, Trash2
} from "lucide-react";
import { toast } from "sonner";
import PurchaseHistory from "@/components/client/PurchaseHistory";
import AdvanceRequestCard from "@/components/employee/AdvanceRequestCard";
import PendingApprovals from "@/components/registration/PendingApprovals";
import RestaurantInfoCard from "@/components/client/RestaurantInfoCard";
import OnboardingFlow from "@/components/client/OnboardingFlow";
import MilestoneProgress from "@/components/client/MilestoneProgress";
import NotificationCenter from "@/components/client/NotificationCenter";
import NotificationPreferences from "@/components/client/NotificationPreferences";
import NotificationPreferencesManager from "@/components/notifications/NotificationPreferencesManager";
import ClientAnalyticsDashboard from "@/components/client/ClientAnalyticsDashboard";
import ReferralNetworkTree from "@/components/client/ReferralNetworkTree";
import ReferredClientAnalytics from "@/components/client/ReferredClientAnalytics";
import CashbackTransactions from "@/components/client/CashbackTransactions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import OpenTabTrigger from "@/components/modules/OpenTabTrigger";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import RewardCard from "@/components/rewards/RewardCard";
import LoyaltyTierDisplay from "@/components/client/LoyaltyTierDisplay";
import LevelUpgradeRequest from "@/components/client/LevelUpgradeRequest";
import RegistrationAssistant from "@/components/client/RegistrationAssistant";
import AddressManagement from "@/components/client/AddressManagement";
import ReferralTrackingSection from "@/components/client/ReferralTrackingSection";
import ReferralLinkShare from "@/components/client/ReferralLinkShare";
import PromotionsDisplay from "@/components/client/PromotionsDisplay";
import PartnershipProgramInfo from "@/components/client/PartnershipProgramInfo";
import RechargeBalanceRequest from "@/components/client/RechargeBalanceRequest";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { calculateClientTier, updateClientTierWithNotification } from "@/components/tierManagement";

function PendingRegistrationStatus({ request }) {
  const statusMessages = {
    pending_referrer: {
      title: "Awaiting Referrer Approval",
      description: `Your registration request is waiting for approval from ${request.referrer_name}.`,
      icon: Clock,
      color: "yellow"
    },
    pending_admin: {
      title: "Awaiting Admin Approval",
      description: "Your referrer has approved! Waiting for admin to verify your payment and activate your account.",
      icon: Clock,
      color: "blue"
    }
  };

  const status = statusMessages[request.status] || statusMessages.pending_referrer;
  const Icon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-${status.color}-100 flex items-center justify-center`}>
            <Icon className={`w-8 h-8 text-${status.color}-600`} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{status.title}</h3>
          <p className="text-sm text-slate-600 mb-6">{status.description}</p>
          
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Name:</span>
              <span className="font-medium">{request.full_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Email:</span>
              <span className="font-medium">{request.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Referrer:</span>
              <span className="font-medium">{request.referrer_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status:</span>
              <Badge className={request.status === "pending_admin" ? "bg-blue-100 text-blue-700" : "bg-warning-100 text-warning-700"}>
                {request.status === "pending_admin" ? "Pending Admin" : "Pending Referrer"}
              </Badge>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 mt-6">
            You'll receive a notification once your account is approved
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function RegistrationRequestForm({ currentUser, clients }) {
  const [referralCode, setReferralCode] = useState("");
  const [phone, setPhone] = useState("");
  const [searchedReferrer, setSearchedReferrer] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list("sort_order"),
    enabled: !!currentUser
  });

  const { data: systemSettings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const list = await base44.entities.SystemSettings.list();
      return list[0] || null;
    },
    enabled: !!currentUser
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list("min_referrals"),
    enabled: !!currentUser
  });

  const createClientMutation = useMutation({
    // Created on the server: it uses this account's email, checks the referral code and sets
    // the balances and referral code itself.
    mutationFn: async ({ referralCode: code, level, phone: phoneVal }) => {
      const { data } = await base44.functions.invoke("registerClient", {
        full_name: currentUser.full_name,
        phone: phoneVal,
        registration_level_id: level.id,
        referral_code: code
      }).catch((e) => { throw new Error(e.response?.data?.error || e.message); });

      // Welcome email: built and sent on the server (Admin › Email decides if it goes and who gets a copy)
      await base44.functions.invoke("sendAccountEmail", { type: "welcome", client_id: data.client_id })
        .catch((e) => console.log("Welcome email could not be sent:", e));

      return { referralCode: data.referral_code, referrerId: data.referrer_id };
    },
    onSuccess: (result, variables) => {
      base44.analytics.track({
        eventName: "client_registered",
        properties: {
          client_name: currentUser.full_name,
          referral_code: result.referralCode,
          referrer_id: result.referrerId,
          registration_level: variables.level.level_name
        }
      });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client"] });
      toast.success(`Welcome to ${brandName()} GenMo! Your account is now active.`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to complete registration");
    }
  });

  const handleSearch = async () => {
    if (!referralCode.trim()) {
      toast.error("Please enter a referral code");
      return;
    }
    // Looked up on the server: other clients' records aren't readable from the browser.
    setIsSearching(true);
    const res = await base44.functions.invoke("registerClient", {
      action: "find_referrer",
      referral_code: referralCode.trim()
    }).catch(() => null);
    setIsSearching(false);
    const referrer = res?.data?.referrer;
    if (referrer) {
      setSearchedReferrer(referrer);
      toast.success(`Found referrer: ${referrer.name}`);
    } else {
      toast.error("Invalid or inactive referral code. Please check and try again.");
      setSearchedReferrer(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // With no code, the server attaches the admin's Default Root Client.
    if (!referralCode.trim() && !systemSettings?.default_root_client_id) {
      toast.error("No default referral code configured. Please contact support.");
      return;
    } else if (referralCode.trim() && !searchedReferrer) {
      toast.error("Please search and verify the referral code first");
      return;
    }

    if (!selectedLevel) {
      toast.error("Please select a registration level");
      return;
    }

    await createClientMutation.mutateAsync({
      referralCode: searchedReferrer?.referral_code || "",
      level: selectedLevel,
      phone
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 flex items-center justify-center p-6">
      {/* AI Registration Assistant - Floating */}
      <RegistrationAssistant compact />
      
      <Card className="w-full max-w-lg border-0 shadow-lg">
        <CardHeader className="text-center">
          <User className="w-12 h-12 mx-auto text-amber-600 mb-3" />
          <h2 className="text-2xl font-bold text-slate-900">Complete Your Registration</h2>
          <p className="text-sm text-slate-500 mt-1">
            Enter a referral code to join GenMo program
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={currentUser?.full_name || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={currentUser?.email || ""} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral_code">Referral Code (Optional)</Label>
              <div className="flex gap-2">
                <Input
                   id="referral_code"
                   value={referralCode}
                   onChange={(e) => {
                     setReferralCode(e.target.value);
                     setSearchedReferrer(null);
                   }}
                   onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                   placeholder="Enter referral code or leave empty"
                 />
                <Button
                   type="button"
                   variant="outline"
                   onClick={handleSearch}
                   disabled={!referralCode || isSearching}
                 >
                   <Search className="w-4 h-4" />
                 </Button>
              </div>
              {!referralCode && systemSettings?.default_root_client_name && (
                <p className="text-xs text-slate-500">
                  No code? We'll use the default referral from {systemSettings.default_root_client_name}
                </p>
              )}
              {searchedReferrer && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-green-600 font-medium mb-1">Welcome to GenMo Program</p>
                    <p className="text-lg font-bold text-green-900 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      {searchedReferrer.name}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-green-200">
                    <div>
                      <p className="text-xs text-green-600 font-medium">Direct Clients</p>
                      <p className="text-lg font-bold text-green-900">
                        {searchedReferrer.direct_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600 font-medium">Total Network</p>
                      <p className="text-lg font-bold text-green-900">
                        {searchedReferrer.network_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600 font-medium">Max Depth</p>
                      <p className="text-lg font-bold text-green-900">
                        {searchedReferrer.depth}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {referralCode && !searchedReferrer && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-900 font-medium mb-2">Referral Code Not Found</p>
                  <p className="text-sm text-red-700 mb-3">
                    The referral code you entered does not exist. Please contact us to investigate.
                  </p>
                  <p className="text-sm font-semibold text-red-800">
                    📞 01099003309
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_level">Registration Level</Label>
              {registrationLevels.length === 0 ? (
                <p className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
                  No registration levels available. Please contact support.
                </p>
              ) : (
                <div className="space-y-2">
                  {registrationLevels.filter(l => l.is_active).map((level) => (
                    <div
                      key={level.id}
                      onClick={() => setSelectedLevel(level)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedLevel?.id === level.id
                          ? "border-amber-500 bg-amber-50"
                          : "border-slate-200 hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-slate-900">{level.level_name}</h4>
                        <span className="text-lg font-bold text-amber-600">
                          {level.registration_fee} EGP
                        </span>
                      </div>
                      {level.description && (
                        <p className="text-sm text-slate-600 mb-2">{level.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          Welcome Cashback: {level.welcome_cashback_amount || 0} EGP
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600"
              disabled={createClientMutation.isPending || (!searchedReferrer && !systemSettings?.default_root_client_id) || !phone.trim() || !selectedLevel}
            >
              {createClientMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Join {brandName()} GenMo
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Section selector groups. Tabs closed in Admin › Modules (or by their GenMo module) are left out.
const PROFILE_GROUPS = [
  ["profile", "rewards", "partnership", "wallet"],
  ["referrals", "tierProgress"],
  ["level", "addresses", "settings"],
  ["analytics", "history"],
];
const gridCols = (n) => ({ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` });

export default function MyProfile() {
  const { t } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [requestedTab, setActiveTab] = useState("profile");
  const screenTabs = useScreenTabs("MyProfile");
  const openGroups = PROFILE_GROUPS.map((keys) => keys.filter(screenTabs.isOpen));
  const activeTab = screenTabs.pick(requestedTab, openGroups.flat()) || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!currentUser
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => base44.entities.Reward.list("-created_date")
  });

  const { data: myRedemptions = [] } = useQuery({
    queryKey: ["myRedemptions", currentUser?.email],
    queryFn: async () => {
      const allRedemptions = await base44.entities.Redemption.list("-created_date");
      const myClient = clients.find(c => c.email === currentUser?.email);
      return myClient ? allRedemptions.filter(r => r.client_id === myClient.id) : [];
    },
    enabled: !!currentUser && clients.length > 0
  });

  const { data: myPendingRequest } = useQuery({
    queryKey: ["myRegistrationRequest", currentUser?.email],
    queryFn: async () => {
      const requests = await base44.entities.RegistrationRequest.filter({ 
        email: currentUser.email
      });
      // Return the most recent pending request (legacy — new registrations auto-activate)
      return requests.find(r => r.status === "pending_admin") || null;
    },
    enabled: !!currentUser
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list("min_referrals")
  });

  const { data: restaurantInfo } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      const list = await base44.entities.RestaurantInfo.list();
      return list[0] || null;
    }
  });

  const { data: systemSettings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const list = await base44.entities.SystemSettings.list();
      return list[0] || null;
    }
  });

  const { data: cashbackTransactions = [] } = useQuery({
    queryKey: ["cashbackTransactions"],
    queryFn: () => base44.entities.CashbackTransaction.list("-created_date")
  });

  // Find the client record matching current user's email
  const myClientRecord = useMemo(() => 
    clients.find(c => c.email === currentUser?.email),
    [clients, currentUser]
  );

  // Get my referrals
  const myReferrals = useMemo(() => 
    clients.filter(c => c.referred_by === myClientRecord?.id),
    [clients, myClientRecord]
  );

  // Calculate total referrals (direct + indirect)
  const getTotalReferrals = (clientId) => {
    let total = 0;
    const directReferrals = clients.filter(c => c.referred_by === clientId);
    total += directReferrals.length;
    directReferrals.forEach(ref => {
      total += getTotalReferrals(ref.id);
    });
    return total;
  };

  const totalReferrals = myClientRecord ? getTotalReferrals(myClientRecord.id) : 0;

  const createRedemptionMutation = useMutation({
    mutationFn: (data) => base44.entities.Redemption.create(data),
    onMutate: async (newRedemption) => {
      await queryClient.cancelQueries({ queryKey: ["myRedemptions"] });
      const previousRedemptions = queryClient.getQueryData(["myRedemptions"]);
      
      const optimisticRedemption = {
        id: `temp-${Date.now()}`,
        ...newRedemption,
        status: "pending",
        created_date: new Date().toISOString()
      };
      
      queryClient.setQueryData(["myRedemptions"], (old) => [...(old || []), optimisticRedemption]);
      
      return { previousRedemptions };
    },
    onError: (error, variables, context) => {
      if (context?.previousRedemptions) {
        queryClient.setQueryData(["myRedemptions"], context.previousRedemptions);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRedemptions"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success("Redemption request submitted! Awaiting admin approval.");
    }
  });

  const filteredRewards = useMemo(() => {
    if (!searchQuery.trim()) return rewards;
    const query = searchQuery.toLowerCase();
    return rewards.filter(r => 
      r.name?.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query)
    );
  }, [rewards, searchQuery]);

  const handleRewardRedeem = async (reward) => {
    if (!myClientRecord) return;

    if ((myClientRecord.cashback_earned || 0) < reward.cashback_cost) {
      toast.error("Insufficient cashback balance");
      return;
    }

    const redemptionCode = `RWD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await createRedemptionMutation.mutateAsync({
      client_id: myClientRecord.id,
      reward_id: reward.id,
      reward_name: reward.name,
      cashback_spent: reward.cashback_cost,
      status: "pending",
      redemption_code: redemptionCode
    });
  };

  // Determine current tier
  const currentTier = useMemo(() => {
    const referralCount = myReferrals.length;
    const sortedTiers = [...tiers].sort((a, b) => b.min_referrals - a.min_referrals);
    return sortedTiers.find(t => referralCount >= t.min_referrals) || tiers.find(t => t.is_default);
  }, [myReferrals, tiers]);

  const handleCopyCode = () => {
    if (myClientRecord?.referral_code) {
      navigator.clipboard.writeText(myClientRecord.referral_code);
      setCopiedCode(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleAccountDeletion = async () => {
    try {
      setIsDeleting(true);
      if (myClientRecord?.id) {
        await base44.entities.Client.delete(myClientRecord.id);
      }
      await base44.auth.logout();
      toast.success("Account deleted successfully");
    } catch (error) {
      toast.error("Failed to delete account: " + (error.message || "Unknown error"));
      setIsDeleting(false);
    }
  };

  const handlePullToRefresh = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      await queryClient.invalidateQueries({ queryKey: ["myRedemptions"] });
      await queryClient.invalidateQueries({ queryKey: ["rewards"] });
      await queryClient.invalidateQueries({ queryKey: ["cashbackTransactions"] });
      toast.success("Profile refreshed!");
    } catch (error) {
      console.error("Refresh failed:", error);
    }
  };

  usePullToRefresh(handlePullToRefresh, true);



  if (!myClientRecord) {
    // Not yet a client — show pending status or registration form
    // Only show form if user is logged in (which they must be to reach MyProfile)
    if (!currentUser) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      );
    }
    if (myPendingRequest) {
      return <PendingRegistrationStatus request={myPendingRequest} />;
    }
    // Show registration form — currentUser (including Facebook users) can register here
    return <RegistrationRequestForm currentUser={currentUser} clients={clients} />;
  }

  // Show onboarding for new clients who haven't completed it
  const showOnboarding = myClientRecord.status === "active" && !myClientRecord.onboarding_completed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 safe-area-inset-top safe-area-inset-bottom">
      {showOnboarding && (
        <OnboardingFlow client={myClientRecord} currentTier={currentTier} />
      )}
      
      {/* Client Info Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">Client Name</p>
                <p className="font-semibold text-slate-900 truncate">{myClientRecord?.name || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">Email Address</p>
                <p className="font-semibold text-slate-900 truncate text-sm">{myClientRecord?.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="w-5 h-5 text-green-600">📱</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">Mobile Number</p>
                <p className="font-semibold text-slate-900 truncate">{myClientRecord?.phone || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6"><AdvanceRequestCard /></div>
        {/* Tabs - Organized by Sections */}
         <div className="mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="space-y-4">
              {/* Section Selector */}
              <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg border shadow-sm">
                {openGroups[0].length > 0 && (
                <button
                  onClick={() => setActiveTab(openGroups[0][0])}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    ["profile", "rewards", "payout", "partnership", "wallet"].includes(activeTab)
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Actions
                </button>
                )}
                {openGroups[1].length > 0 && (
                <button
                  onClick={() => setActiveTab(openGroups[1][0])}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    ["referrals", "tierProgress"].includes(activeTab)
                      ? "bg-violet-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Operations
                </button>
                )}
                {openGroups[2].length > 0 && (
                <button
                  onClick={() => setActiveTab(openGroups[2][0])}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    ["level", "addresses", "settings"].includes(activeTab)
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Settings
                </button>
                )}
                {openGroups[3].length > 0 && (
                <button
                  onClick={() => setActiveTab(openGroups[3][0])}
                  className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                    ["analytics", "history"].includes(activeTab)
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Monitor
                </button>
                )}
              </div>

              {/* Actions Tabs */}
              {["profile", "rewards", "partnership", "wallet"].includes(activeTab) && (
                <TabsList className="bg-white border shadow-sm w-full h-auto grid gap-1 p-1" style={gridCols(openGroups[0].length)}>
                  <OpenTabTrigger screen="MyProfile" value="profile" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('myProfile')}</span>
                    <span className="sm:hidden">Profile</span>
                  </OpenTabTrigger>
                  <OpenTabTrigger screen="MyProfile" value="rewards" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700">
                    <Gift className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('rewards')}</span>
                    <span className="sm:hidden">Rewards</span>
                  </OpenTabTrigger>
                  <OpenTabTrigger screen="MyProfile" value="partnership" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700">
                    <Handshake className="w-4 h-4" />
                    <span className="hidden sm:inline">Partnership</span>
                    <span className="sm:hidden">Partner</span>
                  </OpenTabTrigger>
                  <OpenTabTrigger screen="MyProfile" value="wallet" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700">
                    <Wallet className="w-4 h-4" />
                    <span>Wallet</span>
                  </OpenTabTrigger>
                </TabsList>
              )}

              {/* Operations Tabs */}
              {["referrals", "tierProgress"].includes(activeTab) && (
                <TabsList className="bg-white border shadow-sm w-full h-auto grid gap-1 p-1" style={gridCols(openGroups[1].length)}>
                  <OpenTabTrigger screen="MyProfile" value="referrals" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('myReferrals')}</span>
                    <span className="sm:hidden">Referrals</span>
                  </OpenTabTrigger>
                  <OpenTabTrigger screen="MyProfile" value="tierProgress" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700">
                    <Trophy className="w-4 h-4" />
                    <span className="hidden sm:inline">Tier Progress</span>
                    <span className="sm:hidden">Tiers</span>
                  </OpenTabTrigger>
                </TabsList>
              )}

              {/* Settings Tabs */}
              {["level", "addresses", "settings"].includes(activeTab) && (
                <TabsList className="bg-white border shadow-sm w-full h-auto grid gap-1 p-1" style={gridCols(openGroups[2].length)}>
                  <OpenTabTrigger screen="MyProfile" value="level" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                    <Award className="w-4 h-4" />
                    <span className="hidden sm:inline">Registration Level</span>
                    <span className="sm:hidden">Level</span>
                  </OpenTabTrigger>
                  <OpenTabTrigger screen="MyProfile" value="addresses" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline">Addresses</span>
                    <span className="sm:hidden">Address</span>
                  </OpenTabTrigger>
                  <OpenTabTrigger screen="MyProfile" value="settings" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('settings')}</span>
                    <span className="sm:hidden">Settings</span>
                  </OpenTabTrigger>
                </TabsList>
              )}

              {/* Monitor Tabs */}
              {["analytics", "history"].includes(activeTab) && (
                <TabsList className="bg-white border shadow-sm w-full h-auto grid gap-1 p-1" style={gridCols(openGroups[3].length)}>
                  <OpenTabTrigger screen="MyProfile" value="analytics" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Analytics</span>
                    <span className="sm:hidden">Stats</span>
                  </OpenTabTrigger>
                  <OpenTabTrigger screen="MyProfile" value="history" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row h-auto py-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">History</span>
                    <span className="sm:hidden">History</span>
                  </OpenTabTrigger>
                </TabsList>
              )}
            </div>
          </Tabs>
        </div>

        {!activeTab && <ClosedTabsNotice />}

        {/* Referrals Tab */}
        {activeTab === "referrals" && (
          <ReferralTrackingSection 
            client={myClientRecord} 
            clients={clients}
            cashbackTransactions={cashbackTransactions}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <ClientAnalyticsDashboard clientId={myClientRecord?.id} clientRecord={myClientRecord} systemSettings={systemSettings} />
            <ReferredClientAnalytics clientId={myClientRecord?.id} clients={clients} />
            <CashbackTransactions clientId={myClientRecord?.id} clients={clients} />
          </div>
        )}

        {activeTab === "profile" && (
          <>
        {/* Promotions Display */}
        <PromotionsDisplay clientId={myClientRecord?.id} />

        {/* Pending Status Alert */}
        {myClientRecord.status === "pending" && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <Clock className="w-5 h-5" />
              <h3 className="font-semibold">Registration Pending</h3>
            </div>
            <p className="text-sm text-yellow-700">
              Your registration is awaiting approval. You'll receive your referral code once approved by both your referrer and the admin.
            </p>
          </div>
        )}

        {/* Referral Code Section - At Top */}
        {myClientRecord.status === "active" && myClientRecord.referral_code && (
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">{t('referralCode')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-100 rounded-lg p-4 text-center">
                  <p className="text-sm text-slate-500 mb-2">{t('shareYourCode')}</p>
                  <p className="text-2xl font-bold font-mono tracking-wider text-slate-900">
                    {myClientRecord.referral_code}
                  </p>
                </div>
                <Button 
                  onClick={handleCopyCode}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      {t('referralCode')}
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  Share with friends to earn cashback when they make purchases
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    {t('cashback')}
                  </CardTitle>
                  <PoundSterling className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(myClientRecord.cashback_earned || 0)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    For rewards
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    {t('availablePayout')}
                  </CardTitle>
                  <Wallet className="w-4 h-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(myClientRecord.available_payout || 0)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ready to withdraw
                  </p>
                </CardContent>
              </Card>
            </div>

            <ReferralLinkShare referralCode={myClientRecord.referral_code} clientName={myClientRecord.name} />
            </div>
            )}

            {/* Program Summary Card */}
        <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Handshake className="w-5 h-5 text-amber-600" />
              Partnership Program Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-600">Current Tier</p>
                <p className="text-lg font-bold text-slate-900">{currentTier?.level_name || "N/A"}</p>
                <p className="text-xs text-amber-600">{currentTier?.cashback_percentage || 0}% rate</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Registration Level</p>
                <p className="text-lg font-bold text-slate-900">{myClientRecord?.registration_level_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Direct Referrals</p>
                <p className="text-lg font-bold text-slate-900">{myReferrals.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Total Network</p>
                <p className="text-lg font-bold text-slate-900">{totalReferrals}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-amber-200">
              <div>
                <p className="text-xs text-slate-600">Cashback Balance</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(myClientRecord.cashback_earned || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Available Payout</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(myClientRecord.available_payout || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid lg:grid-cols-3 gap-4 mb-8">
          {/* Left side - Stats */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    {t('directReferrals')}
                  </CardTitle>
                  <Users className="w-4 h-4 text-violet-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {myReferrals.length}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">
                    {t('totalNetwork')}
                  </CardTitle>
                  <GitBranch className="w-4 h-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {totalReferrals}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right side - Current Tier */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Current Tier
              </CardTitle>
              <Trophy className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {currentTier?.level_name || "N/A"}
                </div>
                {currentTier && (
                  <p className="text-xs text-slate-500 mt-1">
                    {currentTier.cashback_percentage}% cashback rate
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Stats Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Total Spent</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(myClientRecord.total_spent || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Visits</span>
                <span className="font-semibold text-slate-900">
                  {myClientRecord.visits_count || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{t('status')}</span>
                <Badge variant={myClientRecord.status === "active" ? "default" : "secondary"}>
                  {t(myClientRecord.status)}
                </Badge>
              </div>
            </CardContent>
          </Card>

        </div>



        {/* Pending Approvals - Only show for active clients */}
        {myClientRecord.status === "active" && (
          <div className="mt-6">
            <PendingApprovals clientId={myClientRecord.id} />
          </div>
        )}

        {/* Loyalty Tier & Notifications */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <LoyaltyTierDisplay client={myClientRecord} />
          <NotificationCenter clientId={myClientRecord?.id} />
        </div>

        {/* Purchase History and Network Purchase History */}
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <PurchaseHistory clientId={myClientRecord?.id} />
          <PurchaseHistory clientId={myClientRecord?.id} showAllNetwork />
        </div>

        {/* Referral Tree */}
        <ReferralNetworkTree client={myClientRecord} clients={clients} tiers={tiers} />

        {/* Contact Restaurant - At Bottom */}
        <div className="mt-6">
          <RestaurantInfoCard />
        </div>
        </>
        )}

        {/* Registration Level Tab */}
        {activeTab === "level" && (
          <LevelUpgradeRequest client={myClientRecord} />
        )}

        {/* Addresses Tab */}
        {activeTab === "addresses" && (
          <AddressManagement clientId={myClientRecord?.id} />
        )}

        {/* Tier Progress Tab */}
        {activeTab === "tierProgress" && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Tier Progress */}
              {tiers.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Tier Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tiers.map((tier) => {
                      const isActive = myReferrals.length >= tier.min_referrals;
                      const isCurrent = currentTier?.id === tier.id;
                      return (
                        <div 
                          key={tier.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isCurrent ? "bg-amber-50 border-2 border-amber-200" : "bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: tier.color }}
                            />
                            <span className="text-sm font-medium">{tier.level_name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">
                              {tier.min_referrals}+ refs • {tier.cashback_percentage}%
                            </p>
                            {isActive && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {isCurrent ? "Current" : "Unlocked"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Milestones */}
              <MilestoneProgress clientId={myClientRecord?.id} referralCount={myReferrals.length} />
            </div>
          </div>
        )}

        {/* Partnership Tab */}
        {activeTab === "partnership" && (
          <PartnershipProgramInfo />
        )}

        {/* Wallet Tab */}
        {activeTab === "wallet" && (
          <RechargeBalanceRequest client={myClientRecord} />
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <NotificationPreferencesManager client={myClientRecord} />
            
            {/* Security & Privacy Section */}
            <Card className="border-0 shadow-sm border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-600 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Security & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-3">
                    Manage your account security and privacy settings
                  </p>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Your data is encrypted and securely stored</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Review and manage your profile information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Control notification preferences</span>
                    </li>
                  </ul>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Privacy Controls</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Account Visibility</p>
                        <p className="text-xs text-slate-600">Your profile is private</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Protected</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">Data Collection</p>
                        <p className="text-xs text-slate-600">Only essential data is collected</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Minimal</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Account Deletion Section */}
            <Card className="border-0 shadow-sm border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900 font-medium mb-2">⚠️ Delete Account</p>
                  <p className="text-sm text-red-800 mb-3">
                    Once you delete your account, there is no going back. All your data will be permanently removed.
                  </p>
                  <p className="text-xs text-red-700 mb-4">
                    This will delete:
                  </p>
                  <ul className="text-xs text-red-700 space-y-1 mb-4">
                    <li>• Your profile and personal information</li>
                    <li>• Cashback and payout balances</li>
                    <li>• Referral network and earnings</li>
                    <li>• All purchase and redemption history</li>
                    <li>• Account history and preferences</li>
                  </ul>
                </div>
                
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2 w-full sm:w-auto h-10 sm:h-9 px-4 sm:px-3">
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Delete My Account</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-sm mx-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-red-600">Permanently Delete Account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <div className="space-y-3">
                          <p className="text-red-900 font-semibold">
                            ⚠️ This action cannot be undone.
                          </p>
                          <p className="text-slate-700">
                            Deleting your account will permanently remove:
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 ml-2">
                            <li>Your profile and personal information</li>
                            <li>Cashback and payout balances</li>
                            <li>Referral network and earnings</li>
                            <li>All purchase and redemption history</li>
                            <li>Account history and preferences</li>
                          </ul>
                          <p className="text-sm text-slate-600 pt-2">
                            If you're having issues, please contact support first.
                          </p>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
                      <AlertDialogCancel disabled={isDeleting} className="h-10 sm:h-9">Keep Account</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleAccountDeletion}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 h-10 sm:h-9"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Yes, Delete Permanently"
                        )}
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Redeem Rewards Tab */}
        {activeTab === "rewards" && (
          <div className="space-y-6">
            {/* Balance Display */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Available Balance</p>
                    <p className="text-4xl font-bold text-emerald-600">
                      {formatCurrency(myClientRecord.cashback_earned || 0)}
                    </p>
                  </div>
                  <PoundSterling className="w-12 h-12 text-emerald-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search rewards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>

            {/* Rewards Grid */}
            {filteredRewards.length === 0 ? (
              <Card className="p-12 text-center border-0 shadow-sm">
                <Gift className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="font-medium text-slate-900">No rewards available</h3>
                <p className="text-sm text-slate-500 mt-1">Check back later for new rewards</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRewards.map(reward => {
                  const hasEnough = (myClientRecord.cashback_earned || 0) >= reward.cashback_cost;
                  const isAvailable = reward.is_redeemable;
                  return (
                    <RewardCard
                      key={reward.id}
                      reward={reward}
                      clientCashback={myClientRecord.cashback_earned || 0}
                      onRedeem={handleRewardRedeem}
                      isRedeeming={createRedemptionMutation.isPending}
                      showClientView={true}
                      canRedeem={hasEnough && isAvailable}
                    />
                  );
                })}
              </div>
            )}

            {/* Redemption History */}
            <Card className="border-0 shadow-sm mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  My Redemption History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myRedemptions.length === 0 ? (
                  <div className="text-center py-12">
                    <Gift className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No redemptions yet</p>
                    <p className="text-sm text-slate-400 mt-1">Start redeeming rewards to see your history here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRedemptions.map(redemption => (
                      <div key={redemption.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{redemption.reward_name}</h4>
                          <p className="text-xs text-slate-500 mt-1">Code: {redemption.redemption_code}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(redemption.created_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">-{formatCurrency(redemption.cashback_spent)}</p>
                          <Badge variant={
                            redemption.status === "used" ? "default" :
                            redemption.status === "pending" ? "secondary" : "destructive"
                          } className="mt-1">
                            {redemption.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Redemption History Tab */}
        {activeTab === "history" && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                My Redemption History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myRedemptions.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No redemptions yet</p>
                  <p className="text-sm text-slate-400 mt-1">Start redeeming rewards to see your history here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRedemptions.map(redemption => (
                    <div key={redemption.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{redemption.reward_name}</h4>
                        <p className="text-xs text-slate-500 mt-1">Code: {redemption.redemption_code}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(redemption.created_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">-{formatCurrency(redemption.cashback_spent)}</p>
                        <Badge variant={
                          redemption.status === "used" ? "default" :
                          redemption.status === "pending" ? "secondary" : "destructive"
                        } className="mt-1">
                          {redemption.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}