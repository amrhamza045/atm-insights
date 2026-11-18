import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Check } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function DeliveryBonusQueue({ canApprove }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const { data } = useQuery({
    queryKey: ["approvals-bonus-pending"],
    queryFn: () => base44.entities.DeliveryBonusRecord.filter({ status: "pending" }, { sort: "-created_date", limit: 50 }),
  });
  const items = data?.items || [];

  const markPaid = async (id) => {
    setBusy(id);
    await base44.entities.DeliveryBonusRecord.update(id, { status: "paid", paid_date: new Date().toISOString() });
    toast.success("Bonus marked as paid");
    queryClient.invalidateQueries({ queryKey: ["approvals-bonus-pending"] });
    setBusy(null);
  };

  if (!items.length) return null;
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <Truck className="w-5 h-5 text-sky-500" /> Delivery Bonuses ({items.length})
      </h2>
      <Card className="border-warning-300 bg-warning-50/50">
        <CardContent className="pt-4 divide-y">
          {items.map((b) => (
            <div key={b.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span><span className="font-semibold">{b.delivery_person_name}</span> · {b.bonus_tier_name} ({b.milestone_count} deliveries)</span>
              <span className="flex items-center gap-3">
                <span className="font-bold">{formatCurrency(b.bonus_amount)}</span>
                {canApprove && <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" disabled={busy === b.id} onClick={() => markPaid(b.id)}><Check className="w-3 h-3" /> Mark paid</Button>}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}