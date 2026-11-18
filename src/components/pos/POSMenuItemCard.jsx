import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function POSMenuItemCard({ item, isFrozen, onAdd, getItemPrice }) {
  return (
    <Card
      className={`transition-all ${isFrozen ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-md"}`}
      onClick={() => onAdd(item)}
    >
      {item.image_url && (
        <div className="h-20 overflow-hidden rounded-t-lg">
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="p-2.5">
        <h3 className="font-medium text-sm mb-0.5 line-clamp-2">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-slate-500 mb-1.5 line-clamp-1">{item.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-amber-600">{formatCurrency(getItemPrice(item))}</span>
          <Button size="sm" variant="ghost" disabled={isFrozen} className="h-6 w-6 p-0">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        {isFrozen && (
          <p className="text-xs text-red-600 font-medium mt-1">⚠️ Stock review in progress</p>
        )}
      </CardContent>
    </Card>
  );
}