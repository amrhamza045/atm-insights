import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function StripePaymentGateway() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["paymentNumbers"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "payment_numbers" });
      return result[0] || null;
    }
  });

  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripePublicKey, setStripePublicKey] = useState("");

  useEffect(() => {
    if (settings) {
      setStripeEnabled(settings.stripe_enabled || false);
      setStripePublicKey(settings.stripe_public_key || "");
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
      toast.success("Stripe settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save Stripe settings");
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      stripe_enabled: stripeEnabled,
      stripe_public_key: stripePublicKey
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Stripe Payment Gateway
        </CardTitle>
        <p className="text-sm text-slate-500">
          Accept credit card payments online through Stripe
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Stripe Payments</Label>
            <p className="text-xs text-slate-500">Process credit card payments securely</p>
          </div>
          <Switch checked={stripeEnabled} onCheckedChange={setStripeEnabled} />
        </div>

        {stripeEnabled && (
          <>
            <div>
              <Label>Stripe Publishable Key</Label>
              <Input
                type="text"
                value={stripePublicKey}
                onChange={(e) => setStripePublicKey(e.target.value)}
                placeholder="pk_test_... or pk_live_..."
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Get this from your Stripe Dashboard → Developers → API keys
              </p>
            </div>

            <p className="text-xs text-slate-500">
              The Stripe secret key is never stored in the app's database. It must be set as a secure environment secret.
            </p>
          </>
        )}

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full bg-amber-500 hover:bg-amber-600"
        >
          {saveMutation.isPending ? "Saving..." : "Save Stripe Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}