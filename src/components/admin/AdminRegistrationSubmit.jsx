import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { distributeCashback, getPayoutPercentage } from "@/components/utils/cashbackDistribution";
import { calculateClientTier, updateClientTierWithNotification } from "@/components/tierManagement";

export default function AdminRegistrationSubmit() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    referral_code: "",
    referrer_client_id: "",
    registration_level_id: ""
  });

  const queryClient = useQueryClient();

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: async () => {
      const levels = await base44.entities.RegistrationLevel.list("sort_order");
      return levels.filter(l => l.is_active);
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list("min_referrals")
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      // Find referrer by client selection or referral code
      let referrer = null;
      if (data.referrer_client_id) {
        referrer = clients.find(c => c.id === data.referrer_client_id);
      } else if (data.referral_code) {
        referrer = clients.find(c => c.referral_code === data.referral_code);
        if (!referrer) {
          throw new Error("Invalid referral code");
        }
      }

      // Get registration level
      const level = registrationLevels.find(l => l.id === data.registration_level_id);
      if (!level) {
        throw new Error("Registration level not found");
      }

      // Generate unique referral code
      const generateReferralCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let referralCode = generateReferralCode();
      while (clients.some(c => c.referral_code === referralCode)) {
        referralCode = generateReferralCode();
      }

      // Get default tier
      const defaultTier = tiers.find(t => t.is_default) || tiers[0];

      // Get welcome cashback from registration level
      const welcomeCashback = level.welcome_cashback_amount || 0;

      // Create the client with welcome cashback directly in cashback_earned
      const newClient = await base44.entities.Client.create({
        name: data.full_name,
        email: data.email,
        phone: data.phone,
        referred_by: referrer?.id || "",
        status: "active",
        referral_code: referralCode,
        registration_level_id: level.id,
        registration_level_name: level.level_name,
        current_tier_id: defaultTier?.id,
        current_tier_name: defaultTier?.level_name,
        cashback_earned: welcomeCashback,
        onboarding_completed: true
      });

      // Create welcome cashback transaction record
      if (welcomeCashback > 0) {
        await base44.entities.CashbackTransaction.create({
          client_id: newClient.id,
          client_name: newClient.name,
          transaction_type: "welcome_cashback",
          amount: welcomeCashback,
          cashback_amount: welcomeCashback,
          payout_amount: 0,
          description: `Welcome bonus of ${welcomeCashback} EGP for registration`
        });
      }

      // Distribute cashback to referrer chain based on registration fee
      if (referrer && level.registration_fee > 0) {
        const referralChain = [];
        let currentReferrerId = referrer.id;
        
        // Build chain of 3 levels up
        for (let i = 0; i < 3; i++) {
          const currentReferrer = clients.find(c => c.id === currentReferrerId);
          if (currentReferrer) {
            referralChain.push({ client: currentReferrer, level: i + 1 });
            currentReferrerId = currentReferrer.referred_by;
            if (!currentReferrerId) break;
          } else {
            break;
          }
        }
        
        // Get payout percentage for split
        const payoutPercentage = await getPayoutPercentage();
        
        // Distribute cashback to each level based on their tier
        for (const { client: referrerClient, level: referralLevel } of referralChain) {
          const referrerTier = tiers.find(t => t.id === referrerClient.current_tier_id);
          if (!referrerTier) continue;
          
          // Get the appropriate cashback percentage based on level
          let cashbackRate = 0;
          if (referralLevel === 1) {
            cashbackRate = referrerTier.cashback_percentage_level1 || 0;
          } else if (referralLevel === 2) {
            cashbackRate = referrerTier.cashback_percentage_level2 || 0;
          } else if (referralLevel === 3) {
            cashbackRate = referrerTier.cashback_percentage_level3 || 0;
          }
          
          if (cashbackRate > 0) {
            const cashbackFromRegistration = (level.registration_fee * cashbackRate) / 100;
            
            // Distribute cashback with 50/50 split (available_payout vs cashback_earned)
            await distributeCashback(referrerClient.id, cashbackFromRegistration, payoutPercentage, {
              type: "referral_cashback",
              source_client_id: newClient.id,
              source_client_name: newClient.name,
              purchase_amount: level.registration_fee,
              referral_level: referralLevel,
              cashback_rate: cashbackRate,
              description: `Referral cashback from ${newClient.name}'s registration (Level ${referralLevel})`
            });
          }
        }
      }

      // Check tier promotion for referral chain (3 levels up)
      if (referrer) {
        const referralChain = [];
        let currentReferrerId = referrer.id;
        
        // Build chain of 3 levels up
        for (let i = 0; i < 3; i++) {
          const currentReferrer = clients.find(c => c.id === currentReferrerId);
          if (currentReferrer) {
            referralChain.push(currentReferrer);
            currentReferrerId = currentReferrer.referred_by;
            if (!currentReferrerId) break;
          } else {
            break;
          }
        }
        
        // Check tier promotion for each level
        for (const referrerInChain of referralChain) {
          const updatedClientsWithNew = [...clients, newClient];
          const newReferrerTier = calculateClientTier(referrerInChain.id, updatedClientsWithNew, tiers, referrerInChain.registration_level_id);
          const oldReferrerTier = tiers.find(t => t.id === referrerInChain.current_tier_id);
          
          if (newReferrerTier && (!oldReferrerTier || newReferrerTier.id !== oldReferrerTier.id)) {
            await updateClientTierWithNotification(referrerInChain.id, newReferrerTier, oldReferrerTier, referrerInChain);
          }
        }
      }

      return newClient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client registered successfully!");
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        referral_code: "",
        referrer_client_id: "",
        registration_level_id: ""
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to register client");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email || !formData.phone || !formData.registration_level_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    submitMutation.mutate(formData);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Register Client (Admin)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>

            <div>
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <Label>Select Referral Client (Optional)</Label>
              <Select
                value={formData.referrer_client_id}
                onValueChange={(value) => setFormData({ ...formData, referrer_client_id: value, referral_code: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select referral client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.referral_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Referral Code (Optional)</Label>
              <Input
                value={formData.referral_code}
                onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase(), referrer_client_id: "" })}
                placeholder="Enter referral code"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Registration Level *</Label>
              <Select
                value={formData.registration_level_id}
                onValueChange={(value) => setFormData({ ...formData, registration_level_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select registration level" />
                </SelectTrigger>
                <SelectContent>
                  {registrationLevels.map(level => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.level_name} - £{level.registration_fee} (£{level.welcome_cashback_amount || 0} cashback)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={submitMutation.isPending}
            className="w-full"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Register Client
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}