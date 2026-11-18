import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, PoundSterling, Wallet } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const SINGLE_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "visa", label: "Visa" },
  { value: "wallet", label: "Wallet" },
  { value: "instapay", label: "Instapay" },
  { value: "cl", label: "CL" },
  { value: "hospitality", label: "Hospitality" },
];

export default function PaymentMethodSelector({
  paymentMethod, setPaymentMethod,
  splitPaymentEnabled, setSplitPaymentEnabled,
  visaAmount, setVisaAmount,
  secondaryPaymentMethod, setSecondaryPaymentMethod,
  selectedCustomer, adjustedTotal, total, remainingAmount,
}) {
  const walletCovers = selectedCustomer?.is_recharge_user && (selectedCustomer.wallet_balance || 0) >= adjustedTotal && adjustedTotal > 0;

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Payment Method</p>
        {!selectedCustomer?.is_recharge_user && (
          <button
            onClick={() => {
              setSplitPaymentEnabled(!splitPaymentEnabled);
              if (!splitPaymentEnabled) { setVisaAmount(""); setSecondaryPaymentMethod("cash"); }
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {splitPaymentEnabled ? "Single Payment" : "Split Payment"}
          </button>
        )}
      </div>

      {walletCovers ? (
        <div className="space-y-2">
          <Button variant="default" size="sm" className="w-full bg-blue-600 hover:bg-blue-700" disabled>
            <Wallet className="w-3 h-3 mr-1" />
            Recharge Balance ({formatCurrency(selectedCustomer.wallet_balance || 0)})
          </Button>
          <p className="text-xs text-slate-500 text-center">Recharge users must pay using their wallet balance</p>
        </div>
      ) : splitPaymentEnabled ? (
        <div className="space-y-3">
          <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900">1. Visa Payment</p>
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <Input
              type="number" step="0.01" min="0" max={total}
              value={visaAmount}
              onChange={(e) => setVisaAmount(e.target.value)}
              placeholder="Enter Visa amount..."
              className="text-right font-medium"
            />
            {visaAmount && parseFloat(visaAmount) > 0 && parseFloat(visaAmount) < total && (
              <p className="text-xs text-blue-700">✓ Visa: {formatCurrency(parseFloat(visaAmount))}</p>
            )}
          </div>

          {visaAmount && parseFloat(visaAmount) > 0 && remainingAmount > 0 && (
            <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-amber-900">2. Remaining Payment</p>
                <PoundSterling className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-lg font-bold text-amber-900">{formatCurrency(remainingAmount)}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={secondaryPaymentMethod === "cash" ? "default" : "outline"} size="sm" onClick={() => setSecondaryPaymentMethod("cash")} className="text-xs">Cash</Button>
                <Button variant={secondaryPaymentMethod === "instapay" ? "default" : "outline"} size="sm" onClick={() => setSecondaryPaymentMethod("instapay")} className="text-xs">Instapay</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {SINGLE_METHODS.map((m) => (
            <Button key={m.value} variant={paymentMethod === m.value ? "default" : "outline"} size="sm" onClick={() => setPaymentMethod(m.value)} className="text-xs">
              {m.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}