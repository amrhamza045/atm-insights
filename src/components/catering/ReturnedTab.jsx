import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, PackageOpen } from "lucide-react";
import EventScopeNotice from "./EventScopeNotice";
import ReturnedItemForm from "./ReturnedItemForm";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { DISPOSITION_LABEL } from "./returnedLabels";
import { useCateringEditAccess } from "@/components/catering/useCateringEditAccess";

export default function ReturnedTab({ event }) {
  const queryClient = useQueryClient();
  const { canEditRecord } = useCateringEditAccess();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["catering-returned", event?.id],
    queryFn: () => base44.entities.CateringReturnedItem.filter({ event_id: event.id }, "-created_date", 200),
    enabled: !!event?.id,
  });

  if (!event) return <EventScopeNotice />;
  const canWrite = canEditRecord(event);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["catering-returned", event.id] });

  const remove = async (id) => {
    await base44.entities.CateringReturnedItem.delete(id);
    refresh();
  };

  const totalValue = rows.reduce((s, r) => s + (r.total_value || 0), 0);

  return (
    <div className="space-y-4">
      {canWrite && <ReturnedItemForm event={event} onSaved={refresh} />}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-slate-900">Unused items returned from this event</p>
          <Badge className="bg-slate-100 text-slate-700">Total value {formatCurrency(totalValue)}</Badge>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-8">
            <PackageOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Nothing logged yet for this event.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Disposition</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.item_name}</TableCell>
                    <TableCell className="capitalize">{(r.category || "").replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right">{r.quantity} {r.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.unit_cost || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.total_value || 0)}</TableCell>
                    <TableCell className="capitalize">{r.condition}</TableCell>
                    <TableCell>{DISPOSITION_LABEL[r.disposition] || r.disposition}</TableCell>
                    <TableCell className="text-right">
                      {canWrite && (
                        <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}