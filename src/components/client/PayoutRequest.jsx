import { useState } from "react";
import { brandName } from "@/lib/brandName";
import { companyPeriodStart } from "@/components/utils/timezoneHelper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fileLinkProps } from "@/lib/privateFiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PoundSterling, Wallet, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PayoutRequest({ clientId, currentBalance, availablePayout, totalPayout, consumedPayout }) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDetails, setPaymentDetails] = useState("");
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["payoutSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "payout_settings" });
      return result[0] || { payout_percent: 100, min_payout_amount: 50 };
    }
  });

  const { data: paymentMethodSettings } = useQuery({
    queryKey: ["paymentMethodSettings"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "payment_methods" });
      return result[0] || { 
        bank_transfer_enabled: true,
        paypal_enabled: true,
        cash_enabled: true,
        instapay_enabled: true,
        wallet_enabled: true
      };
    }
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["myPayouts", clientId],
    queryFn: async () => {
      const allPayouts = await base44.entities.Payout.list("-created_date");
      return allPayouts.filter(p => p.client_id === clientId);
    },
    enabled: !!clientId
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
    enabled: !!clientId
  });

  const requestPayoutMutation = useMutation({
    mutationFn: async (data) => {
      const myClient = clients.find(c => c.id === clientId);
      if (!myClient) throw new Error("Client not found");
      
      // Server decides the status (pending, or rejected when a limit is exceeded).
      const res = await base44.functions.invoke("submitPayoutRequest", {
        amount: data.amount,
        payment_method: data.payment_method,
        payment_details: data.payment_details
      });
      const payout = res.data.payout;

      const status = payout.status;
      let notificationTitle = "";
      let notificationMessage = "";
      
      if (status === "rejected") {
        notificationTitle = "Payout Request Rejected";
        notificationMessage = `Your payout request for £${data.amount} has been rejected. Reason: ${payout.rejection_reason}`;
      } else {
        notificationTitle = "Payout Request Submitted";
        notificationMessage = `Your payout request for £${data.amount} has been submitted and is pending approval.`;
      }

      // Send notification to client
      await base44.entities.Notification.create({
        client_id: clientId,
        client_email: myClient.email,
        title: notificationTitle,
        message: notificationMessage,
        type: "system",
        icon: status === "rejected" ? "x-circle" : "clock"
      });

      // Send email to client
      await base44.integrations.Core.SendEmail({
        from_name: brandName(),
        to: myClient.email,
        subject: `${brandName()} Partner: ${notificationTitle}`,
        body: notificationMessage
      });

      // If pending, notify admins of new payout request
      if (status === "pending") {
        // Recipients (payouts_approve holders) are resolved on the server.
        await base44.functions.invoke('notifyPayoutRequest', { payout_id: payout.id });

        // Create notification for client
        await base44.entities.Notification.create({
          client_id: data.client_id,
          client_email: myClient.email,
          title: "Payout Request Submitted",
          message: `Your withdrawal request for £${data.amount} has been submitted and is pending admin approval.`,
          type: "system",
          icon: "PoundSterling"
        });
      }

      return payout;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["myPayouts", clientId] });
      const previousPayouts = queryClient.getQueryData(["myPayouts", clientId]);
      
      const optimisticPayout = {
        id: `temp-${Date.now()}`,
        ...data,
        status: data.status || "pending",
        created_date: new Date().toISOString()
      };
      
      queryClient.setQueryData(["myPayouts", clientId], (old) => [...(old || []), optimisticPayout]);
      return { previousPayouts };
    },
    onError: (error, variables, context) => {
      if (context?.previousPayouts) {
        queryClient.setQueryData(["myPayouts", clientId], context.previousPayouts);
      }
      toast.error("Failed to submit payout request");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPayouts", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Payout request submitted successfully!");
      setAmount("");
      setPaymentDetails("");
    }
  });

  const minPayoutAmount = settings?.min_payout_amount || 50;
  const payoutPercentage = settings?.payout_percent || 100;
  const maxPayoutAmount = availablePayout || 0;

  const availablePaymentMethods = [
    { value: "bank_transfer", label: "Bank Transfer", enabled: paymentMethodSettings?.bank_transfer_enabled !== false },
    { value: "paypal", label: "PayPal", enabled: paymentMethodSettings?.paypal_enabled !== false },
    { value: "cash", label: "Cash Pickup", enabled: paymentMethodSettings?.cash_enabled !== false },
    { value: "instapay_transfer", label: "Instapay Transfer", enabled: paymentMethodSettings?.instapay_enabled !== false },
    { value: "wallet_transfer", label: "Wallet Transfer", enabled: paymentMethodSettings?.wallet_enabled !== false }
  ].filter(method => method.enabled);

  const checkWithdrawalLimits = async (amountNum) => {
    const myClient = clients.find(c => c.id === clientId);
    if (!myClient) return { allowed: true };

    // Get default limits from system settings
    const defaultLimits = await base44.entities.SystemSettings.filter({ setting_key: "payout_settings" });
    const defaults = defaultLimits[0] || {};

    // Use client-specific limits if set, otherwise use defaults
    const dailyLimit = myClient.daily_withdrawal_limit ?? defaults.default_daily_withdrawal_limit;
    const weeklyLimit = myClient.weekly_withdrawal_limit ?? defaults.default_weekly_withdrawal_limit;
    const monthlyLimit = myClient.monthly_withdrawal_limit ?? defaults.default_monthly_withdrawal_limit;

    // If no limits are set at all, allow withdrawal
    if (!dailyLimit && !weeklyLimit && !monthlyLimit) {
      return { allowed: true };
    }

    const startOfDay = companyPeriodStart("day");
    const startOfWeek = companyPeriodStart("week");
    const startOfMonth = companyPeriodStart("month");

    // Get completed payouts
    const completedPayouts = payouts.filter(p => p.status === "completed");

    // Calculate totals
    const dailyTotal = completedPayouts
      .filter(p => new Date(p.created_date) >= startOfDay)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const weeklyTotal = completedPayouts
      .filter(p => new Date(p.created_date) >= startOfWeek)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const monthlyTotal = completedPayouts
      .filter(p => new Date(p.created_date) >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    // Check limits
    if (dailyLimit && (dailyTotal + amountNum) > dailyLimit) {
      return { 
        allowed: false, 
        message: `Daily withdrawal limit exceeded. You have withdrawn £${dailyTotal.toFixed(2)} today. Limit: £${dailyLimit}` 
      };
    }

    if (weeklyLimit && (weeklyTotal + amountNum) > weeklyLimit) {
      return { 
        allowed: false, 
        message: `Weekly withdrawal limit exceeded. You have withdrawn £${weeklyTotal.toFixed(2)} this week. Limit: £${weeklyLimit}` 
      };
    }

    if (monthlyLimit && (monthlyTotal + amountNum) > monthlyLimit) {
      return { 
        allowed: false, 
        message: `Monthly withdrawal limit exceeded. You have withdrawn £${monthlyTotal.toFixed(2)} this month. Limit: £${monthlyLimit}` 
      };
    }

    return { allowed: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amountNum < minPayoutAmount) {
      toast.error(`Minimum payout amount is £${minPayoutAmount}`);
      return;
    }

    if (amountNum > maxPayoutAmount) {
      toast.error(`Maximum payout amount is £${maxPayoutAmount.toFixed(2)}`);
      return;
    }

    if (!paymentDetails.trim()) {
      toast.error("Please provide payment details");
      return;
    }

    // Check withdrawal limits
    const limitCheck = await checkWithdrawalLimits(amountNum);
    if (!limitCheck.allowed) {
      // Create rejected payout request with limit exceeded message
      requestPayoutMutation.mutate({
        amount: amountNum,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        status: "rejected",
        rejection_reason: limitCheck.message
      });
      toast.error(limitCheck.message);
      return;
    }

    requestPayoutMutation.mutate({
      amount: amountNum,
      payment_method: paymentMethod,
      payment_details: paymentDetails
    });
  };

  const statusConfig = {
    pending: { icon: Clock, color: "bg-warning-100 text-warning-700", label: "Pending" },
    processing: { icon: AlertCircle, color: "bg-blue-100 text-blue-700", label: "Processing" },
    completed: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Completed" },
    rejected: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Rejected" }
  };

  return (
    <div className="space-y-6">
      {/* Request Form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Request Cashback Payout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Wallet className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Available Payout Balance</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{(availablePayout || 0).toFixed(2)} EGP</p>
                  <p className="text-xs text-blue-600 mt-1">Ready for withdrawal</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500">Total Earned</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{(totalPayout || 0).toFixed(2)} EGP</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500">Already Withdrawn</p>
                <p className="text-lg font-bold text-slate-600 mt-1">{(consumedPayout || 0).toFixed(2)} EGP</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-slate-500">Cashback Balance</p>
                <p className="text-lg font-bold text-amber-700 mt-1">{currentBalance.toFixed(2)} EGP</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Minimum withdrawal: {minPayoutAmount} EGP • Payout rate: {payoutPercentage}%
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Amount to Withdraw</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={`Min ${minPayoutAmount} EGP`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePaymentMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Details</Label>
              <Input
                placeholder={
                  paymentMethod === "bank_transfer" 
                    ? "Bank account number" 
                    : paymentMethod === "paypal"
                    ? "PayPal email"
                    : paymentMethod === "instapay_transfer"
                    ? "Mobile number for Instapay transfer"
                    : paymentMethod === "wallet_transfer"
                    ? "Mobile number for wallet transfer"
                    : "Phone number for cash pickup"
                }
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-600"
              disabled={requestPayoutMutation.isPending}
            >
              <Wallet className="w-4 h-4 mr-2" />
              {requestPayoutMutation.isPending ? "Submitting..." : "Request Payout"}
            </Button>
            {(availablePayout || 0) < minPayoutAmount && (
              <p className="text-xs text-red-500 text-center mt-2">
                Minimum withdrawal is {minPayoutAmount} EGP. Your available payout: {(availablePayout || 0).toFixed(2)} EGP
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No payout requests yet</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => {
                const StatusIcon = statusConfig[payout.status].icon;
                return (
                  <div key={payout.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold text-slate-900">{payout.amount.toFixed(2)} EGP</p>
                          <Badge className={statusConfig[payout.status].color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[payout.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {payout.payment_method.replace("_", " ")} - {payout.payment_details}
                        </p>
                        {payout.transaction_reference && (
                          <p className="text-xs text-slate-500 mt-1">
                            Ref: {payout.transaction_reference}
                          </p>
                        )}
                        {payout.receipt_url && (
                          <a
                            {...fileLinkProps(payout.receipt_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 underline mt-1 inline-block"
                          >
                            📄 View Transfer Receipt
                          </a>
                        )}
                        {payout.rejection_reason && (
                          <p className="text-xs text-red-600 mt-1">
                            Reason: {payout.rejection_reason}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(payout.created_date).toLocaleDateString()}
                      </span>
                    </div>
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