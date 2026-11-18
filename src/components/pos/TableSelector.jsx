import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowLeft, SplitSquareHorizontal, CheckCircle2 } from "lucide-react";

export default function TableSelector({ onSelectTable, onBack }) {
  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => base44.entities.Table.filter({ is_active: true }, "table_number")
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "pending"],
    queryFn: () => base44.entities.Order.filter({ status: "pending", order_type: "dine_in" })
  });

  const getTableOrder = (table) => orders.find(o => o.table_id === table.id);
  const getTableStatus = (table) => getTableOrder(table) ? "occupied" : "empty";

  const getSplitInfo = (table) => {
    const order = getTableOrder(table);
    if (!order?.split_check?.enabled) return null;
    const splits = order.split_check.splits || [];
    const paidCount = splits.filter(s => s.paid).length;
    return { total: splits.length, paid: paidCount, allPaid: paidCount === splits.length && splits.length > 0 };
  };

  const getTableColor = (table) => {
    const status = getTableStatus(table);
    if (status === "occupied") return "bg-green-100 border-green-500 hover:bg-green-200";
    return "bg-slate-100 border-slate-300 hover:bg-slate-200";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Select Table</h2>
          <p className="text-sm text-slate-500">Choose a table for dine-in order</p>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {tables.map((table) => {
          const status = getTableStatus(table);
          const split = getSplitInfo(table);
          return (
            <button
              key={table.id}
              onClick={() => onSelectTable(table)}
              className={`${getTableColor(table)} relative p-4 rounded-lg border-2 transition-all hover:scale-105`}
            >
              {split && (
                <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                  <SplitSquareHorizontal className="w-2.5 h-2.5" />
                  {split.paid}/{split.total}
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <span className="font-bold text-2xl">{table.table_number}</span>
                <Badge variant={status === "occupied" ? "default" : "secondary"} className="text-xs">
                  {status === "occupied" ? "Occupied" : "Empty"}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Users className="w-3 h-3" />
                  <span>{table.capacity || 4}</span>
                </div>
                {split && (
                  <div className="flex flex-wrap gap-0.5 justify-center w-full">
                    {Array.from({ length: split.total }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full ${i < split.paid ? "bg-green-500" : "bg-slate-300"}`}
                      />
                    ))}
                  </div>
                )}
                {split?.allPaid && (
                  <div className="flex items-center gap-0.5 text-green-600 text-[10px] font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    All Paid
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {tables.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-slate-500">No tables configured. Please add tables in Admin Panel.</p>
        </Card>
      )}
    </div>
  );
}