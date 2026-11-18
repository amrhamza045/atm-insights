import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function CaptainMenuItemCard({ item, onAdd }) {
  const priority = item.sell_priority || "none";
  const isPush = priority === "push";
  const isSlow = priority === "slow";

  return (
    <Card
      className={`transition-all cursor-pointer hover:shadow-md ${
        isPush ? "border-2 border-emerald-500 bg-emerald-50/40" : isSlow ? "border-2 border-rose-300 bg-rose-50/40" : ""
      }`}
      onClick={() => onAdd(item)}
    >
      {item.image_url && (
        <div className="h-20 overflow-hidden rounded-t-lg">
          <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover ${isSlow ? "opacity-60" : ""}`} />
        </div>
      )}
      <CardContent className="p-2.5">
        {isPush && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5 mb-1">
            <TrendingUp className="w-3 h-3" /> Sell this
          </span>
        )}
        {isSlow && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-100 rounded px-1.5 py-0.5 mb-1">
            <TrendingDown className="w-3 h-3" /> Slow down
          </span>
        )}
        <h3 className="font-medium text-sm mb-0.5 line-clamp-2">{item.name}</h3>
        {item.steering_note && (
          <p className="text-xs text-slate-600 italic mb-1 line-clamp-2">{item.steering_note}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-amber-600">{formatCurrency(item.price)}</span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}