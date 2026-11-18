import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useOpenTab from "@/hooks/useOpenTab";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import POSOrderCashbackGeneration from "./POSOrderCashbackGeneration";

export default function CashbackDistributionApprovals() {
  const queryClient = useQueryClient();
  const [selectedPending, setSelectedPending] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  // Both tabs can be closed in Admin › Modules, per role or per user.
  const approvalTab = useOpenTab("AdminCashbackApprovals", ["approvals", "pos-generation"]);

  const { data: allDistributions = [], isLoading } = useQuery({
    queryKey: ["pendingCashbackDistributions"],
    queryFn: async () => {
      const [pending, approved] = await Promise.all([
        base44.entities.CashbackDistributionPending.filter({ status: "pending_approval" }),
        base44.entities.CashbackDistributionPending.filter({ status: "approved" })
      ]);
      return [...pending, ...approved];
    }
  });

  const pendingDistributions = allDistributions;

  const approveMutation = useMutation({
    mutationFn: async (pendingId) => {
      // Approval + execution both happen server-side behind payouts_approve —
      // the browser must never be the thing that authorises a money movement.
      const result = await base44.functions.invoke("approveCashbackDistribution", {
        pending_id: pendingId
      });
      if (result.data?.error) throw new Error(result.data.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingCashbackDistributions"] });
      toast.success("Distribution approved and executed — client balances updated");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (pendingId) => {
      // Rejection is the same authorisation boundary as approval — server-side only.
      const result = await base44.functions.invoke("rejectCashbackDistribution", {
        pending_id: pendingId,
        rejection_reason: rejectionReason
      });
      if (result.data?.error) throw new Error(result.data.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingCashbackDistributions"] });
      setRejectionReason("");
      toast.success("Distribution rejected");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const executeMutation = useMutation({
    mutationFn: async (pendingId) => {
      return await base44.functions.invoke("executeCashbackDistribution", {
        pending_id: pendingId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingCashbackDistributions"] });
      toast.success("Distribution executed successfully");
    },
    onError: (error) => {
      toast.error(`Error executing: ${error.message}`);
    }
  });

  const triggerGenerationMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke("generateCashbackDistributions", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingCashbackDistributions"] });
      toast.success("Cashback generation triggered");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  const handleApprove = (pending) => {
    if (window.confirm(`Approve cashback distribution for ${pending.customer_name}?`)) {
      approveMutation.mutate(pending.id);
    }
  };

  const handleReject = (pending) => {
    setSelectedPending(pending);
  };

  const handleExecute = (pending) => {
    if (window.confirm(`Execute cashback distribution for ${pending.customer_name}?`)) {
      executeMutation.mutate(pending.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cashback Distribution Approvals</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!approvalTab.value) return <ClosedTabsNotice />;

  return (
    <Tabs value={approvalTab.value} onValueChange={approvalTab.setValue} className="w-full">
      <TabsList className={`grid w-full ${approvalTab.isOpen("approvals") && approvalTab.isOpen("pos-generation") ? "grid-cols-2" : "grid-cols-1"}`}>
        {approvalTab.isOpen("approvals") && <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>}
        {approvalTab.isOpen("pos-generation") && <TabsTrigger value="pos-generation">POS Cashback Generation</TabsTrigger>}
      </TabsList>

      <TabsContent value="approvals">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Cashback Distribution Approvals</CardTitle>
                <CardDescription>
                  Review and approve pending cashback distributions ({pendingDistributions.length} pending)
                </CardDescription>
              </div>
              <Button
                onClick={() => triggerGenerationMutation.mutate()}
                disabled={triggerGenerationMutation.isPending}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Generate Now
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
        {pendingDistributions.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No pending cashback distributions. They are generated automatically daily at 2 AM UTC.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {pendingDistributions.map((pending) => (
              <div
                key={pending.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-base">{pending.customer_name}</h4>
                    <p className="text-xs text-slate-500">Order #{pending.order_id} • {pending.payment_method}</p>
                  </div>
                  <Badge className="bg-slate-100 text-slate-800">{pending.order_type}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="border-b pb-2">
                    <p className="text-slate-500 text-xs">Order Total</p>
                    <p className="font-semibold text-base">{pending.order_total.toFixed(2)} EGP</p>
                  </div>
                  <div className="border-b pb-2">
                    <p className="text-slate-500 text-xs">Order Type</p>
                    <p className="font-semibold text-base capitalize">{pending.order_type}</p>
                  </div>
                </div>

                {/* Cashback Breakdown */}
                <div className="bg-emerald-50 rounded-lg p-3 space-y-2 border border-emerald-200">
                  <p className="font-semibold text-slate-900 text-sm">Cashback Distribution Breakdown</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-600">Self Cashback</p>
                      <p className="font-semibold text-emerald-700">{pending.cashback_to_customer.toFixed(2)} EGP</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Self Payout</p>
                      <p className="font-semibold text-emerald-700">{pending.payout_to_customer.toFixed(2)} EGP</p>
                    </div>
                  </div>

                  {/* Level-wise breakdown */}
                  {pending.referral_cashback_details?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 space-y-2">
                      {[1, 2, 3].map(level => {
                        const levelCashback = pending.referral_cashback_details
                          ?.filter(r => r.referral_level === level)
                          ?.reduce((sum, r) => sum + r.cashback_amount, 0) || 0;
                        return levelCashback > 0 ? (
                          <div key={level}>
                            <p className="text-slate-600 text-xs">L{level} Cashback</p>
                            <p className="font-semibold text-emerald-700">{levelCashback.toFixed(2)} EGP</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="mt-2 pt-2 border-t border-emerald-200 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-slate-600 font-semibold text-xs">TOTAL CASHBACK</p>
                      <p className="font-bold text-base text-emerald-700">{pending.cashback_amount.toFixed(2)} EGP</p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-semibold text-xs">TOTAL PAYOUT</p>
                      <p className="font-bold text-base text-emerald-700">{(pending.cashback_to_customer + pending.payout_to_customer + (pending.referral_cashback_details?.reduce((sum, r) => sum + r.cashback_amount, 0) || 0)).toFixed(2)} EGP</p>
                    </div>
                  </div>
                </div>

                {pending.referral_cashback_details?.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
                    <p className="font-semibold text-slate-700 text-sm">Individual Referrer Breakdown</p>
                    {pending.referral_cashback_details.map((ref, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm p-2 bg-white rounded border border-slate-100">
                        <div>
                          <span className="font-medium text-slate-900">{ref.referrer_name}</span>
                          <span className="text-xs text-slate-500 ml-2">(Level {ref.referral_level})</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{ref.cashback_amount.toFixed(2)} EGP</p>
                          <p className="text-xs text-slate-500">@ {ref.cashback_rate}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {pending.status === "approved" ? (
                    <Button
                      onClick={() => handleExecute(pending)}
                      disabled={executeMutation.isPending}
                      variant="default"
                      size="sm"
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Check className="w-4 h-4" />
                      Execute Now
                    </Button>
                  ) : (
                  <Button
                    onClick={() => handleApprove(pending)}
                    disabled={approveMutation.isPending}
                    variant="default"
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </Button>
                  )}

                  {pending.status === "approved" && <Badge className="bg-blue-100 text-blue-800 ml-auto self-center">Approved – Pending Execution</Badge>}
                  <Dialog open={selectedPending?.id === pending.id} onOpenChange={(open) => {
                    if (!open) setSelectedPending(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => handleReject(pending)}
                        variant="outline"
                        size="sm"
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Distribution</DialogTitle>
                        <DialogDescription>
                          Provide a reason for rejecting this cashback distribution
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="h-24"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedPending(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              rejectMutation.mutate(pending.id);
                              setSelectedPending(null);
                            }}
                            disabled={rejectMutation.isPending || !rejectionReason.trim()}
                            variant="destructive"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
          )
        }
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="pos-generation">
        <POSOrderCashbackGeneration />
      </TabsContent>
    </Tabs>
  );
}