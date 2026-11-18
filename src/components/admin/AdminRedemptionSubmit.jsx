import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Gift, Loader2, Search, PoundSterling } from "lucide-react";
import { toast } from "sonner";

export default function AdminRedemptionSubmit() {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date")
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => base44.entities.Reward.list("-created_date")
  });

  const createRedemptionMutation = useMutation({
    mutationFn: async (data) => {
      // Create redemption
      const redemption = await base44.entities.Redemption.create(data);
      
      // Deduct cashback from client
      const client = clients.find(c => c.id === data.client_id);
      await base44.entities.Client.update(data.client_id, {
        cashback_earned: (client.cashback_earned || 0) - data.cashback_spent
      });

      return redemption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["redemptions"] });
      toast.success("Redemption submitted successfully on behalf of client");
      setSelectedClientId("");
      setSelectedRewardId("");
      setCustomAmount("");
      setClientSearch("");
    },
    onError: () => {
      toast.error("Failed to submit redemption");
    }
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedReward = rewards.find(r => r.id === selectedRewardId);

  const filteredClients = clientSearch.trim()
    ? clients.filter(c => 
        c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone?.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClient || !selectedReward) {
      toast.error("Please select both client and reward");
      return;
    }

    const isVariableCost = selectedReward.is_variable_cost;
    const cashbackAmount = isVariableCost 
      ? parseFloat(customAmount)
      : selectedReward.cashback_cost;

    if (isVariableCost && (!customAmount || cashbackAmount <= 0)) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (cashbackAmount > (selectedClient.cashback_earned || 0)) {
      toast.error("Client has insufficient cashback balance");
      return;
    }

    const redemptionCode = `RWD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await createRedemptionMutation.mutateAsync({
      client_id: selectedClient.id,
      reward_id: selectedReward.id,
      reward_name: selectedReward.name,
      cashback_spent: cashbackAmount,
      status: "used",
      redemption_code: redemptionCode
    });
  };

  const calculatedAmount = selectedReward?.is_variable_cost 
    ? parseFloat(customAmount) || 0
    : selectedReward?.cashback_cost || 0;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-500" />
          Submit Redemption for Client
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">Select Client *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <Input
                placeholder="Search client by name, email, or phone..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setSelectedClientId("");
                }}
                className="pl-10"
              />
            </div>

            {clientSearch && filteredClients.length > 0 && !selectedClientId && (
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2 bg-white">
                {filteredClients.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setClientSearch("");
                    }}
                    className="w-full text-left p-2 hover:bg-slate-50 rounded transition-colors"
                  >
                    <p className="font-medium text-sm">{client.name}</p>
                    <p className="text-xs text-slate-500">{client.email} • {client.phone}</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Available: £{(client.cashback_earned || 0).toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selectedClient && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{selectedClient.name}</p>
                    <p className="text-xs text-slate-500">{selectedClient.email}</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Available Cashback: £{(selectedClient.cashback_earned || 0).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedClientId("");
                      setClientSearch("");
                    }}
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Reward Selection */}
          <div className="space-y-2">
            <Label htmlFor="reward">Select Reward *</Label>
            <Select value={selectedRewardId} onValueChange={setSelectedRewardId}>
              <SelectTrigger id="reward">
                <SelectValue placeholder="Choose a reward" />
              </SelectTrigger>
              <SelectContent>
                {rewards.filter(r => r.is_redeemable).map(reward => (
                  <SelectItem key={reward.id} value={reward.id}>
                    {reward.name} {!reward.is_variable_cost && `- £${reward.cashback_cost.toFixed(2)}`}
                    {reward.is_variable_cost && " - Variable Cost"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Amount for Variable Cost */}
          {selectedReward?.is_variable_cost && (
            <div className="space-y-2">
              <Label htmlFor="amount">Redemption Amount *</Label>
              <div className="flex items-center gap-2">
                <PoundSterling className="w-4 h-4 text-amber-500" />
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedClient?.cashback_earned || 0}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount to deduct"
                  required
                />
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedClient && selectedReward && (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-semibold text-sm text-slate-900">Redemption Summary</h4>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Client:</span>
                <span className="font-medium">{selectedClient.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Reward:</span>
                <span className="font-medium">{selectedReward.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Current Balance:</span>
                <span className="font-medium text-emerald-600">
                  £{(selectedClient.cashback_earned || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-slate-600">Amount to Deduct:</span>
                <span className="font-bold text-red-600">
                  -£{calculatedAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">New Balance:</span>
                <span className="font-bold text-slate-900">
                  £{((selectedClient.cashback_earned || 0) - calculatedAmount).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600"
            disabled={
              createRedemptionMutation.isPending ||
              !selectedClientId ||
              !selectedRewardId ||
              (selectedReward?.is_variable_cost && !customAmount) ||
              calculatedAmount > (selectedClient?.cashback_earned || 0)
            }
          >
            {createRedemptionMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Submit Redemption
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}