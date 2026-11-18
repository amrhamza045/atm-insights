import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LastPurchaseCostField({ formData, latestPurchase, onChange }) {
  const unit = formData.purchase_unit_label || (formData.purchase_unit === "weight" ? "kg" : "pcs");

  return (
    <div>
      <Label>Cost per {unit} (EGP)</Label>
      <Input
        type="number"
        step="0.01"
        value={formData.cost_per_unit}
        onChange={(event) => onChange(event.target.value)}
        readOnly={!!latestPurchase}
        className={latestPurchase ? "bg-slate-50" : ""}
      />
      {latestPurchase && (
        <p className="mt-1 text-xs text-slate-500">
          Average purchase cost, updated each time an invoice is posted. Latest purchase: {latestPurchase.invoiceNumber || "Invoice"}
          {latestPurchase.supplierName ? ` · ${latestPurchase.supplierName}` : ""}
          {latestPurchase.invoiceDate ? ` · ${latestPurchase.invoiceDate}` : ""}
        </p>
      )}
    </div>
  );
}