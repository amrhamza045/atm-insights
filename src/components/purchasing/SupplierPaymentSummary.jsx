import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { fileLinkProps } from "@/lib/privateFiles";
import { CreditCard, FileText, PoundSterling, CheckCircle2, Clock } from "lucide-react";

export function SupplierBalanceStrip({ totalSpent = 0, totalPaid = 0, remaining = 0, onPay, canPay = false }) {
  return (
    <div className="space-y-2 mt-3 pt-3 border-t">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-[11px] text-slate-500" title="Posted invoices minus supplier returns">Total Spent</p>
          <p className="font-bold text-xs sm:text-sm text-slate-900">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50/70 p-2">
          <p className="text-[11px] text-emerald-700">Total Paid</p>
          <p className="font-bold text-xs sm:text-sm text-emerald-700">{formatCurrency(totalPaid)}</p>
        </div>
        <div className={`rounded-lg p-2 ${remaining > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
          <p className={`text-[11px] ${remaining > 0 ? "text-amber-700" : "text-slate-500"}`}>Remaining</p>
          <p className={`font-bold text-xs sm:text-sm ${remaining > 0 ? "text-amber-700" : "text-slate-600"}`}>
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>
      {canPay && (
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onPay?.();
          }}
          disabled={remaining <= 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs"
        >
          <CreditCard className="w-3.5 h-3.5" />
          Pay
        </Button>
      )}
    </div>
  );
}

export function SupplierBalanceCards({ totalSpent = 0, totalPaid = 0, remaining = 0, onPay, canPay = false }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PoundSterling className="w-4 h-4 text-slate-600" />
              <p className="text-xs text-slate-500">Total Spent</p>
            </div>
            <p className="text-[11px] text-slate-400 -mt-1 mb-1">Invoices − supplier returns</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-emerald-700">Total Paid</p>
            </div>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>

        <Card className={remaining > 0 ? "border-amber-200 bg-amber-50/40" : ""}>
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className={`w-4 h-4 ${remaining > 0 ? "text-amber-600" : "text-slate-400"}`} />
                <p className={`text-xs ${remaining > 0 ? "text-amber-700" : "text-slate-500"}`}>Remaining</p>
              </div>
              <p className={`text-xl font-bold ${remaining > 0 ? "text-amber-700" : "text-slate-600"}`}>
                {formatCurrency(remaining)}
              </p>
            </div>
            {canPay && (
              <Button
                size="sm"
                onClick={onPay}
                disabled={remaining <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0"
              >
                <CreditCard className="w-4 h-4" />
                Pay
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const SOURCE_LABELS = {
  invoice: "Invoice settlement",
  historical: "Historical settlement",
  supplier_pay: "Supplier payment",
  legacy: "Supplier payment",
};

export function SupplierPaymentsList({ payments = [] }) {
  if (payments.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-500 text-sm">
        No payments recorded for this supplier in the selected branch yet.
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {payments.map((payment) => (
        <Card key={payment.id}>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-emerald-700">{formatCurrency(payment.amount)}</span>
                <Badge variant="outline" className="text-xs">
                  {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : "—"}
                </Badge>
                <Badge variant="secondary" className="text-xs">{SOURCE_LABELS[payment.source] || "Payment"}</Badge>
                {payment.payment_method_name && <Badge variant="outline" className="text-xs">{payment.payment_method_name}</Badge>}
              </div>
              {payment.invoice_numbers?.length > 0 && (
                <p className="text-xs text-slate-500">Invoices: {payment.invoice_numbers.join(", ")}</p>
              )}
              {payment.recorded_by && <p className="text-xs text-slate-500">Recorded by {payment.recorded_by}</p>}
              {payment.notes && <p className="text-xs text-slate-600">{payment.notes}</p>}
            </div>

            {payment.confirmation_file_uri && (
              <a
                {...fileLinkProps(payment.confirmation_file_uri)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200"
              >
                <FileText className="w-3.5 h-3.5" />
                {payment.confirmation_file_name || "View Confirmation"}
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}