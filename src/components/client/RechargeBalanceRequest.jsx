import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { uploadPrivateReceipt } from "@/lib/privateFiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wallet, Upload, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function RechargeBalanceRequest({ client }) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: recharges = [] } = useQuery({
    queryKey: ["myRecharges", client?.id],
    queryFn: () => base44.entities.BalanceRecharge.filter({ client_id: client.id }, "-created_date"),
    enabled: !!client?.id
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      let receiptUrl = null;
      if (receiptFile) {
        setUploading(true);
        receiptUrl = await uploadPrivateReceipt(receiptFile);
        setUploading(false);
      }

      // Server forces "pending" and validates the amount.
      const res = await base44.functions.invoke("submitBalanceRechargeRequest", {
        amount_paid: data.amount_paid,
        payment_method: data.payment_method,
        payment_receipt_url: receiptUrl
      });
      return res.data.recharge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myRecharges"] });
      toast.success("Recharge request submitted! Waiting for admin approval.");
      setAmount("");
      setPaymentMethod("cash");
      setReceiptFile(null);
    },
    onError: (error) => {
      toast.error("Failed to submit: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const rechargeAmount = parseFloat(amount);
    
    if (!rechargeAmount || rechargeAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    submitMutation.mutate({
      client_id: client.id,
      client_name: client.name,
      client_email: client.email,
      amount_paid: rechargeAmount,
      payment_method: paymentMethod
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            Your Prepaid Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Available Balance</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(client.wallet_balance || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Recharged</p>
              <p className="text-2xl font-semibold text-slate-700">{formatCurrency(client.total_recharged || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recharge Request Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Balance Recharge</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Amount (EGP)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to recharge"
                required
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="instapay">Instapay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Payment Receipt (Optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setReceiptFile(e.target.files[0])}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitMutation.isPending || uploading}
            >
              {uploading ? "Uploading..." : submitMutation.isPending ? "Submitting..." : "Submit Recharge Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recharge History */}
      <Card>
        <CardHeader>
          <CardTitle>Recharge History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recharges.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No recharges yet</p>
            ) : (
              recharges.map((recharge) => (
                <div key={recharge.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        recharge.status === "approved" ? "default" :
                        recharge.status === "rejected" ? "destructive" : "outline"
                      }>
                        {recharge.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                        {recharge.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {recharge.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                        {recharge.status}
                      </Badge>
                      <span className="text-sm text-slate-500">{recharge.payment_method}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(recharge.created_date).toLocaleString()}
                    </p>
                    {recharge.status === "rejected" && recharge.rejection_reason && (
                      <p className="text-xs text-red-600 mt-1">Reason: {recharge.rejection_reason}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">{formatCurrency(recharge.amount_paid)}</p>
                    {recharge.status === "approved" && (
                      <>
                        <p className="text-xs text-green-600">+{formatCurrency(recharge.cashback_amount)} cashback</p>
                        <p className="text-sm font-bold text-blue-600">= {formatCurrency(recharge.total_credited)}</p>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}