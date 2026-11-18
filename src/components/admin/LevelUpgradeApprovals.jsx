import { useState } from "react";
import { brandName } from "@/lib/brandName";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fileLinkProps } from "@/lib/privateFiles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { distributeCashback, getPayoutPercentage } from "@/components/utils/cashbackDistribution";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function LevelUpgradeApprovals() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["levelUpgradeRequests"],
    queryFn: () => base44.entities.LevelUpgradeRequest.filter({ status: "pending" }, "-created_date")
  });

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list("sort_order")
  });

  const { data: cashbackTiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list()
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      const level = registrationLevels.find(l => l.id === request.requested_level_id);
      
      if (!level) {
        throw new Error("Registration level not found");
      }

      // Calculate welcome cashback based on the level (100% goes to cashback_earned)
      const welcomeCashback = (level.registration_fee * level.welcome_cashback_percentage) / 100;
      
      // Fetch current client to get existing cashback balance
      const client = allClients.find(c => c.id === request.client_id);

      // Get direct referrals count to determine new tier
      const directReferrals = allClients.filter(c => c.referred_by === request.client_id);
      
      // Find the appropriate cashback tier for the new registration level
      const tiersForLevel = cashbackTiers.filter(t => t.registration_level_id === request.requested_level_id);
      const sortedTiers = tiersForLevel.sort((a, b) => b.min_referrals - a.min_referrals);
      const newTier = sortedTiers.find(t => directReferrals.length >= t.min_referrals) || 
                      tiersForLevel.find(t => t.is_default) || 
                      tiersForLevel[0];
      
      // Update client record with new level, tier, and welcome cashback (100% to cashback_earned)
      await base44.entities.Client.update(request.client_id, {
        registration_level_id: level.id,
        registration_level_name: level.level_name,
        current_tier_id: newTier?.id,
        current_tier_name: newTier?.level_name,
        cashback_earned: (client?.cashback_earned || 0) + welcomeCashback
      });

      // Create welcome cashback transaction record for level upgrade
      if (welcomeCashback > 0) {
        await base44.entities.CashbackTransaction.create({
          client_id: request.client_id,
          client_name: request.client_name,
          transaction_type: "welcome_cashback",
          amount: welcomeCashback,
          cashback_amount: welcomeCashback,
          payout_amount: 0,
          description: `Welcome bonus for upgrading to ${level.level_name}`
        });
      }
      
      // Update request status
      await base44.entities.LevelUpgradeRequest.update(requestId, {
        status: "approved"
      });

      // Send notification
      await base44.entities.Notification.create({
        client_id: request.client_id,
        client_email: request.client_email,
        title: "Level Upgrade Approved! 🎉",
        message: `Your upgrade to ${request.requested_level_name} has been approved! Welcome cashback of £${welcomeCashback.toFixed(2)} has been added to your cashback balance.`,
        type: "system",
        read: false
      });

      // Send email
      await base44.integrations.Core.SendEmail({
        to: request.client_email,
        from_name: `${brandName()} Partner`,
        subject: "Level Upgrade Approved! 🎉",
        body: `
          <h2>Congratulations ${request.client_name}!</h2>
          <p>Your registration level upgrade has been approved.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>New Level: ${request.requested_level_name}</h3>
            <p><strong>Welcome Bonus:</strong> £${welcomeCashback.toFixed(2)} added to your cashback balance</p>
            ${level.permanent_discount_percentage > 0 ? `<p><strong>Permanent Discount:</strong> ${level.permanent_discount_percentage}%</p>` : ''}
            ${level.delivery_discount_percentage > 0 ? `<p><strong>Delivery Discount:</strong> ${level.delivery_discount_percentage}%</p>` : ''}
          </div>
          
          <p>Enjoy your enhanced benefits!</p>
          <p>Best regards,<br>The ${brandName()} Partner Team</p>
        `
      });

      base44.analytics.track({
        eventName: "level_upgrade_approved",
        properties: {
          client_id: request.client_id,
          level: request.requested_level_name,
          fee: request.registration_fee
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["levelUpgradeRequests"]);
      queryClient.invalidateQueries(["clients"]);
      toast.success("Upgrade approved! Client level updated.");
    },
    onError: () => {
      toast.error("Failed to approve upgrade");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      
      await base44.entities.LevelUpgradeRequest.update(requestId, {
        status: "rejected",
        rejection_reason: rejectionReason || "Payment not confirmed"
      });

      // Send notification
      await base44.entities.Notification.create({
        client_id: request.client_id,
        client_email: request.client_email,
        title: "Level Upgrade Rejected",
        message: `Your upgrade request to ${request.requested_level_name} was rejected. Reason: ${rejectionReason || "Payment not confirmed"}`,
        type: "system",
        read: false
      });

      base44.analytics.track({
        eventName: "level_upgrade_rejected",
        properties: {
          client_id: request.client_id,
          level: request.requested_level_name
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["levelUpgradeRequests"]);
      toast.success("Upgrade request rejected");
      setRejectingId(null);
      setRejectionReason("");
    },
    onError: () => {
      toast.error("Failed to reject upgrade");
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">No pending upgrade requests</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{request.client_name}</CardTitle>
                  <CardDescription>{request.client_email}</CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  Pending Review
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Current Level</p>
                  <p className="font-medium">{request.current_level_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Requested Level</p>
                  <p className="font-medium text-amber-600">{request.requested_level_name}</p>
                </div>
                <div>
                  <p className="text-slate-500">Registration Fee</p>
                  <p className="font-medium">£{request.registration_fee}</p>
                </div>
                <div>
                  <p className="text-slate-500">Welcome Cashback</p>
                  <p className="font-medium text-green-600">
                    £{(request.registration_fee * request.welcome_cashback_percentage / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {request.payment_receipt_url && (
                <a
                  {...fileLinkProps(request.payment_receipt_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Payment Receipt
                </a>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(request.id)}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve & Upgrade
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectingId(request.id)}
                  disabled={rejectMutation.isPending}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Upgrade Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this upgrade request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectMutation.mutate(rejectingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}