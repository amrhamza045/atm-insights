import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Banknote, Smartphone, Wallet, CreditCard, Landmark, Globe, ToggleLeft } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { key: "cash_enabled", label: "Cash", icon: Banknote, description: "Accept cash payments at the counter" },
  { key: "instapay_enabled", label: "InstaPay", icon: Smartphone, description: "Accept InstaPay transfers" },
  { key: "wallet_enabled", label: "Mobile Wallet", icon: Wallet, description: "Accept mobile wallet transfers (Vodafone Cash, etc.)" },
  { key: "stripe_enabled", label: "Stripe (Credit Card)", icon: CreditCard, description: "Accept online credit card payments via Stripe" },
  { key: "bank_transfer_enabled", label: "Bank Transfer", icon: Landmark, description: "Accept direct bank transfers" },
  { key: "paypal_enabled", label: "PayPal", icon: Globe, description: "Accept PayPal payments" },
];

export default function PaymentMethodsToggle() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["paymentNumbers"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "payment_numbers" });
      return result[0] || null;
    }
  });

  const [methods, setMethods] = useState(
    PAYMENT_METHODS.reduce((acc, m) => ({ ...acc, [m.key]: true }), {})
  );

  useEffect(() => {
    if (settings) {
      setMethods(
        PAYMENT_METHODS.reduce((acc, m) => ({
          ...acc,
          [m.key]: settings[m.key] !== undefined ? settings[m.key] : true
        }), {})
      );
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return await base44.entities.SystemSettings.update(settings.id, data);
      } else {
        return await base44.entities.SystemSettings.create({
          setting_key: "payment_numbers",
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentNumbers"] });
      queryClient.invalidateQueries({ queryKey: ["paymentSettings"] });
      toast.success("Payment methods updated successfully");
    },
    onError: () => {
      toast.error("Failed to update payment methods");
    }
  });

  const handleToggle = (key, value) => {
    setMethods(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(methods);
  };

  const enabledCount = Object.values(methods).filter(Boolean).length;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ToggleLeft className="w-5 h-5" />
          Enabled Payment Methods
        </CardTitle>
        <p className="text-sm text-slate-500">
          Toggle which payment methods are available to clients and cashiers ({enabledCount} of {PAYMENT_METHODS.length} enabled)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {PAYMENT_METHODS.map(({ key, label, icon: Icon, description }) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-md border border-slate-200">
                <Icon className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <Label className="font-medium text-sm cursor-pointer">{label}</Label>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
            </div>
            <Switch
              checked={methods[key]}
              onCheckedChange={(value) => handleToggle(key, value)}
            />
          </div>
        ))}

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full bg-amber-500 hover:bg-amber-600"
        >
          {saveMutation.isPending ? "Saving..." : "Save Payment Methods"}
        </Button>
      </CardContent>
    </Card>
  );
}