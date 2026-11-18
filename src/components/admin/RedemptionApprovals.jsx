import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RedemptionApprovals() {
  const queryClient = useQueryClient();

  const { data: redemptions = [], isLoading } = useQuery({
    queryKey: ["pendingRedemptions"],
    queryFn: async () => {
      const allRedemptions = await base44.entities.Redemption.list("-created_date");
      return allRedemptions.filter(r => r.status === "pending");
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const approveRedemptionMutation = useMutation({
    mutationFn: async (redemption) => {
      const client = clients.find(c => c.id === redemption.client_id);
      if (!client) throw new Error("Client not found");

      // Deduct cashback from client
      await base44.entities.Client.update(client.id, {
        cashback_earned: (client.cashback_earned || 0) - redemption.cashback_spent
      });

      // Update redemption status
      await base44.entities.Redemption.update(redemption.id, { status: "used" });

      // Send notification to client
      await base44.entities.Notification.create({
        client_id: redemption.client_id,
        client_email: client.email,
        title: "Reward Redemption Approved! ✅",
        message: `Your ${redemption.reward_name} redemption has been approved! Your redemption code is ${redemption.redemption_code}.`,
        type: "redemption",
        read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pendingRedemptions"]);
      queryClient.invalidateQueries(["clients"]);
      queryClient.invalidateQueries(["notifications"]);
      toast.success("Redemption approved and cashback deducted");
    },
    onError: () => {
      toast.error("Failed to approve redemption");
    }
  });

  const rejectRedemptionMutation = useMutation({
    mutationFn: async (redemptionId) => {
      await base44.entities.Redemption.update(redemptionId, { status: "rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pendingRedemptions"]);
      toast.success("Redemption rejected");
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (redemptions.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-12 text-center">
          <Gift className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No pending redemptions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {redemptions.map((redemption) => {
        const client = clients.find(c => c.id === redemption.client_id);
        return (
          <Card key={redemption.id} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-slate-900">{redemption.reward_name}</h3>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>Client: {client?.name || redemption.client_id}</p>
                    <p>Email: {client?.email}</p>
                    <p>Current Balance: £{(client?.cashback_earned || 0).toFixed(2)}</p>
                    <p>Cashback to Deduct: £{redemption.cashback_spent?.toFixed(2)}</p>
                    <p>Code: {redemption.redemption_code}</p>
                    <Badge variant="outline" className="mt-2">Pending Approval</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveRedemptionMutation.mutate(redemption)}
                    disabled={approveRedemptionMutation.isPending || rejectRedemptionMutation.isPending}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {approveRedemptionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectRedemptionMutation.mutate(redemption.id)}
                    disabled={approveRedemptionMutation.isPending || rejectRedemptionMutation.isPending}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}