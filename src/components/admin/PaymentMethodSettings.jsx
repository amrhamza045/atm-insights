import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Wallet, Smartphone, Percent } from "lucide-react";
import { toast } from "sonner";


export default function PaymentMethodSettings() {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["paymentNumbers"],
    queryFn: async () => {
      const result = await base44.entities.SystemSettings.filter({ setting_key: "payment_numbers" });
      return result[0] || null;
    }
  });

  const [instapayNumber, setInstapayNumber] = useState("");
  const [walletNumber, setWalletNumber] = useState("");
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [servicePercentage, setServicePercentage] = useState(0);
  const [dineInTax, setDineInTax] = useState(0);
  const [dineInService, setDineInService] = useState(0);
  const [deliveryTax, setDeliveryTax] = useState(0);
  const [deliveryService, setDeliveryService] = useState(0);
  const [takeawayTax, setTakeawayTax] = useState(0);
  const [takeawayService, setTakeawayService] = useState(0);
  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setInstapayNumber(settings.instapay_number || "");
      setWalletNumber(settings.wallet_number || "");
      setTaxPercentage(settings.default_tax_percentage || 0);
      setServicePercentage(settings.default_service_percentage || 0);
      setDineInTax(settings.dine_in_tax_percentage || 0);
      setDineInService(settings.dine_in_service_percentage || 0);
      setDeliveryTax(settings.delivery_tax_percentage || 0);
      setDeliveryService(settings.delivery_service_percentage || 0);
      setTakeawayTax(settings.takeaway_tax_percentage || 0);
      setTakeawayService(settings.takeaway_service_percentage || 0);
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
      toast.success("Payment settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save payment settings");
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      instapay_number: instapayNumber,
      wallet_number: walletNumber,
      default_tax_percentage: taxPercentage,
      default_service_percentage: servicePercentage,
      dine_in_tax_percentage: dineInTax,
      dine_in_service_percentage: dineInService,
      delivery_tax_percentage: deliveryTax,
      delivery_service_percentage: deliveryService,
      takeaway_tax_percentage: takeawayTax,
      takeaway_service_percentage: takeawayService
    });
  };

  return (
    <>
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Payment & Tax Settings
        </CardTitle>
        <p className="text-sm text-slate-500">
          Configure payment numbers and default tax percentage
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Default Tax Percentage
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="e.g., 14"
            value={taxPercentage}
            onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">
            Tax percentage automatically applied to all orders
          </p>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Default Service Charge Percentage
          </Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="e.g., 12"
            value={servicePercentage}
            onChange={(e) => setServicePercentage(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">
            Service charge percentage automatically applied to all orders
          </p>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-base mb-4">Order Type Specific Settings</h3>
          
          {/* Dine-In */}
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium mb-3 text-sm">🍽️ Dine-In Orders</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tax %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={dineInTax}
                  onChange={(e) => setDineInTax(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Service %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={dineInService}
                  onChange={(e) => setDineInService(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium mb-3 text-sm">🚚 Delivery Orders</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tax %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={deliveryTax}
                  onChange={(e) => setDeliveryTax(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Service %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={deliveryService}
                  onChange={(e) => setDeliveryService(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Takeaway */}
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium mb-3 text-sm">🛍️ Takeaway Orders</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tax %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={takeawayTax}
                  onChange={(e) => setTakeawayTax(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Service %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={takeawayService}
                  onChange={(e) => setTakeawayService(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Instapay Number
          </Label>
          <Input
            placeholder="e.g., 01234567890"
            value={instapayNumber}
            onChange={(e) => setInstapayNumber(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">
            Clients will see this number when paying via Instapay
          </p>
        </div>

        <div>
          <Label className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Mobile Wallet Number
          </Label>
          <Input
            placeholder="e.g., 01234567890"
            value={walletNumber}
            onChange={(e) => setWalletNumber(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">
            Clients will see this number when paying via Mobile Wallet
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full bg-amber-500 hover:bg-amber-600"
        >
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
    </>
  );
}